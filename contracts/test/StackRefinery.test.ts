import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ENTRY_FEE = ethers.parseEther("0.001");
const DAY = 86_400;
const DEAD = "0x000000000000000000000000000000000000dEaD";
const RATE_PER_SEC = ethers.parseEther("3000000") / 86400n; // 3M/day

describe("Stack Refinery (treasury model)", () => {
  async function deployFixture() {
    const [deployer, dev, alice, bob, carol] = await ethers.getSigners();

    // Stand-in for the ponz.family token: fixed 1B supply to deployer
    const token = await (await ethers.getContractFactory("MockStack")).deploy();
    const nft = await (await ethers.getContractFactory("MinerNFT")).deploy();
    const refinery = await (
      await ethers.getContractFactory("StackRefinery")
    ).deploy(
      await token.getAddress(),
      await nft.getAddress(),
      dev.address,
      RATE_PER_SEC
    );
    await nft.setRefinery(await refinery.getAddress());

    // Fund the reward pool with 500M STACK
    await token
      .connect(deployer)
      .transfer(await refinery.getAddress(), ethers.parseEther("500000000"));

    return { token, nft, refinery, deployer, dev, alice, bob, carol };
  }

  describe("setup", () => {
    it("token has fixed 1B supply; pool holds 500M", async () => {
      const { token, refinery } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(ethers.parseEther("1000000000"));
      expect(await refinery.rewardPool()).to.equal(ethers.parseEther("500000000"));
    });

    it("fundRewards tops up the pool from any wallet", async () => {
      const { token, refinery, deployer, alice } = await loadFixture(deployFixture);
      await token.connect(deployer).transfer(alice.address, ethers.parseEther("100"));
      await token.connect(alice).approve(await refinery.getAddress(), ethers.MaxUint256);
      await expect(refinery.connect(alice).fundRewards(ethers.parseEther("100")))
        .to.emit(refinery, "RewardsFunded");
      expect(await refinery.rewardPool()).to.equal(ethers.parseEther("500000100"));
    });

    it("NFT refinery wiring is one-shot", async () => {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.setRefinery(alice.address)).to.be.revertedWithCustomError(
        nft,
        "RefineryAlreadySet"
      );
    });
  });

  describe("enterFacility", () => {
    it("opens a tier-1 facility with a free hand drill", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });

      expect(await refinery.hasFacility(alice.address)).to.equal(true);
      expect(await refinery.facilityTier(alice.address)).to.equal(1);
      expect(await refinery.facilityGridSize(alice.address)).to.equal(2);
      expect(await refinery.playerHashrate(alice.address)).to.equal(1);
      expect(await refinery.totalNetworkHashrate()).to.equal(1);
      expect(await refinery.facilityPowerUsed(alice.address)).to.equal(1);
    });

    it("rejects wrong fee and double entry", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      await expect(
        refinery.connect(alice).enterFacility("", { value: 0 })
      ).to.be.revertedWithCustomError(refinery, "WrongEntryFee");
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await expect(
        refinery.connect(alice).enterFacility("", { value: ENTRY_FEE })
      ).to.be.revertedWithCustomError(refinery, "AlreadyEntered");
    });
  });

  describe("emission", () => {
    it("sole miner earns the full emission rate (3M/day)", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });

      await time.increase(DAY);
      const pending = await refinery.pendingRewards(alice.address);
      expect(pending).to.be.closeTo(ethers.parseEther("3000000"), ethers.parseEther("1000"));
    });

    it("splits emission by hashrate share", async () => {
      const { refinery, alice, bob } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await refinery.connect(bob).enterFacility("", { value: ENTRY_FEE });

      await time.increase(DAY);
      const a = await refinery.pendingRewards(alice.address);
      const b = await refinery.pendingRewards(bob.address);
      expect(a).to.be.closeTo(b, ethers.parseEther("100"));
    });

    it("halves the rate after HALVING_INTERVAL", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      const rate0 = await refinery.emissionRatePerSec();
      expect(rate0).to.equal(RATE_PER_SEC);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await time.increase(13_680_000);
      expect(await refinery.emissionRatePerSec()).to.equal(rate0 / 2n);
    });

    it("integrates piecewise across a halving boundary", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await time.increase(13_680_000 - DAY);
      const before = await refinery.pendingRewards(alice.address);
      await time.increase(2 * DAY);
      const after = await refinery.pendingRewards(alice.address);
      const twoDays = after - before;
      // day at full rate + day at half rate = 1.5 days of launch emission
      expect(twoDays).to.be.closeTo(ethers.parseEther("4500000"), ethers.parseEther("2000"));
    });
  });

  describe("claims and referrals", () => {
    it("pays 95.5% net with no referrer; carve-out stays in the pool", async () => {
      const { refinery, token, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await time.increase(DAY);

      const poolBefore = await refinery.rewardPool();
      await refinery.connect(alice).claimRewards();
      const bal = await token.balanceOf(alice.address);
      const poolAfter = await refinery.rewardPool();
      const gross = poolBefore - poolAfter; // only net left the pool
      // net = 95.5% of gross claim
      expect(bal).to.equal(gross);
      const paid = await refinery.totalRewardsPaid();
      expect(bal).to.be.closeTo((paid * 9550n) / 10_000n, ethers.parseEther("1"));
    });

    it("routes direct (1%), second-level (0.5%), dev (3%) at tier 1", async () => {
      const { refinery, token, dev, alice, bob, carol } = await loadFixture(deployFixture);
      // carol refers bob, bob refers alice
      await refinery.connect(carol).enterFacility("", { value: ENTRY_FEE });
      await refinery.connect(carol).createReferralCode("carolcode");
      await refinery.connect(bob).enterFacility("carolcode", { value: ENTRY_FEE });
      await refinery.connect(bob).createReferralCode("bobcode1");
      await refinery.connect(alice).enterFacility("bobcode1", { value: ENTRY_FEE });

      await time.increase(DAY);
      const grossEst = await refinery.pendingRewards(alice.address);
      await refinery.connect(alice).claimRewards();

      const tol = ethers.parseEther("200");
      expect(await token.balanceOf(alice.address)).to.be.closeTo(
        (grossEst * 9550n) / 10_000n, tol);
      expect(await token.balanceOf(bob.address)).to.be.closeTo(
        (grossEst * 100n) / 10_000n, tol); // direct 1%
      expect(await token.balanceOf(carol.address)).to.be.closeTo(
        (grossEst * 50n) / 10_000n, tol); // second level 0.5%
      expect(await token.balanceOf(dev.address)).to.be.closeTo(
        (grossEst * 300n) / 10_000n, tol); // remainder 3%
      expect(await refinery.referredVolume(bob.address)).to.be.gt(0);
    });

    it("clips claims to the pool balance and preserves the remainder", async () => {
      const [deployer, dev, alice] = await ethers.getSigners();
      const token = await (await ethers.getContractFactory("MockStack")).deploy();
      const nft = await (await ethers.getContractFactory("MinerNFT")).deploy();
      const refinery = await (
        await ethers.getContractFactory("StackRefinery")
      ).deploy(await token.getAddress(), await nft.getAddress(), dev.address, RATE_PER_SEC);
      await nft.setRefinery(await refinery.getAddress());

      // Tiny pool: 1000 STACK
      await token.connect(deployer).transfer(await refinery.getAddress(), ethers.parseEther("1000"));
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await time.increase(DAY); // accrues ~3M, pool has 1000

      const pendingBefore = await refinery.pendingRewards(alice.address);
      await refinery.connect(alice).claimRewards();
      // pool drained, player got 95.5% of the 1000
      expect(await refinery.rewardPool()).to.be.lt(ethers.parseEther("50"));
      expect(await token.balanceOf(alice.address)).to.be.closeTo(
        ethers.parseEther("955"), ethers.parseEther("1"));
      // the rest is still pending, claimable after a refund
      const pendingAfter = await refinery.pendingRewards(alice.address);
      expect(pendingAfter).to.be.closeTo(
        pendingBefore - ethers.parseEther("1000"), ethers.parseEther("100"));

      await token.connect(deployer).transfer(await refinery.getAddress(), ethers.parseEther("5000000"));
      await refinery.connect(alice).claimRewards();
      expect(await token.balanceOf(alice.address)).to.be.gt(ethers.parseEther("955"));
    });

    it("rejects self-referral and 2-wallet loops", async () => {
      const { refinery, alice, bob } = await loadFixture(deployFixture);
      await refinery.connect(alice).createReferralCode("alicecode");
      await expect(
        refinery.connect(alice).enterFacility("alicecode", { value: ENTRY_FEE })
      ).to.be.revertedWithCustomError(refinery, "SelfReferral");

      await refinery.connect(bob).enterFacility("alicecode", { value: ENTRY_FEE });
      expect(await refinery.referrer(bob.address)).to.equal(alice.address);
      await refinery.connect(bob).createReferralCode("bobcode1");
      await expect(
        refinery.connect(alice).enterFacility("bobcode1", { value: ENTRY_FEE })
      ).to.be.revertedWithCustomError(refinery, "SelfReferral");
    });

    it("validates referral codes (charset, length, uniqueness, one per wallet)", async () => {
      const { refinery, alice, bob } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await expect(refinery.connect(alice).createReferralCode("ab")).to.be.revertedWithCustomError(
        refinery, "InvalidCode");
      await expect(refinery.connect(alice).createReferralCode("UPPER")).to.be.revertedWithCustomError(
        refinery, "InvalidCode");
      await refinery.connect(alice).createReferralCode("goodcode");
      await expect(refinery.connect(alice).createReferralCode("another1")).to.be.revertedWithCustomError(
        refinery, "CodeAlreadyCreated");
      await expect(refinery.connect(bob).createReferralCode("goodcode")).to.be.revertedWithCustomError(
        refinery, "CodeTaken");
    });
  });

  describe("miners", () => {
    async function fundedPlayer() {
      const fx = await loadFixture(deployFixture);
      const { refinery, token, deployer, alice } = fx;
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await token.connect(deployer).transfer(alice.address, ethers.parseEther("2000000"));
      await token.connect(alice).approve(await refinery.getAddress(), ethers.MaxUint256);
      return fx;
    }

    it("buyMiner sends 75% to dead address and banks 25% in the pool", async () => {
      const { refinery, token, nft, alice } = await fundedPlayer();
      const poolBefore = await refinery.rewardPool();
      await refinery.connect(alice).buyMiner(1); // 1000 STACK
      expect(await token.balanceOf(DEAD)).to.equal(ethers.parseEther("750"));
      expect(await refinery.totalBurned()).to.equal(ethers.parseEther("750"));
      expect((await refinery.rewardPool()) - poolBefore).to.equal(ethers.parseEther("250"));
      expect(await nft.balanceOf(alice.address)).to.equal(1);
      expect(await nft.minerTier(1)).to.equal(1);
      expect(await nft.minerHashrate(1)).to.equal(5);
    });

    it("places a miner: hashrate, power, grid occupancy", async () => {
      const { refinery, alice } = await fundedPlayer();
      await refinery.connect(alice).buyMiner(1);
      await refinery.connect(alice).placeMiner(1, 1, 0);

      expect(await refinery.playerHashrate(alice.address)).to.equal(6); // 1 + 5
      expect(await refinery.facilityPowerUsed(alice.address)).to.equal(4); // 1 + 3
      await refinery.connect(alice).buyMiner(1);
      await expect(
        refinery.connect(alice).placeMiner(2, 1, 0)
      ).to.be.revertedWithCustomError(refinery, "CellOccupied");
    });

    it("enforces grid bounds and power limits", async () => {
      const { refinery, alice } = await fundedPlayer();
      await refinery.connect(alice).buyMiner(3); // 2x2 excavator
      await expect(
        refinery.connect(alice).placeMiner(1, 1, 1)
      ).to.be.revertedWithCustomError(refinery, "OutOfBounds");
      await expect(
        refinery.connect(alice).placeMiner(1, 0, 0)
      ).to.be.revertedWithCustomError(refinery, "CellOccupied");
      await refinery.connect(alice).buyMiner(2);
      await refinery.connect(alice).placeMiner(2, 1, 0); // power 1+8=9 of 10
      await refinery.connect(alice).buyMiner(1);
      await expect(
        refinery.connect(alice).placeMiner(3, 0, 1)
      ).to.be.revertedWithCustomError(refinery, "PowerExceeded");
    });

    it("removeMiner enforces the 24h cooldown then frees the cell", async () => {
      const { refinery, alice } = await fundedPlayer();
      await refinery.connect(alice).buyMiner(1);
      await refinery.connect(alice).placeMiner(1, 1, 0);
      await expect(refinery.connect(alice).removeMiner(1)).to.be.revertedWithCustomError(
        refinery, "Cooldown");
      await time.increase(DAY + 1);
      await refinery.connect(alice).removeMiner(1);
      expect(await refinery.playerHashrate(alice.address)).to.equal(1);
      await refinery.connect(alice).placeMiner(1, 1, 0);
    });
  });

  describe("facility upgrades", () => {
    it("upgrades tier with cost and cooldown; 75% of cost burned", async () => {
      const { refinery, token, deployer, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await token.connect(deployer).transfer(alice.address, ethers.parseEther("100000"));
      await token.connect(alice).approve(await refinery.getAddress(), ethers.MaxUint256);

      await refinery.connect(alice).upgradeFacility(); // 10K STACK -> tier 2
      expect(await refinery.facilityTier(alice.address)).to.equal(2);
      expect(await refinery.facilityGridSize(alice.address)).to.equal(3);
      expect(await token.balanceOf(DEAD)).to.equal(ethers.parseEther("7500"));

      await expect(refinery.connect(alice).upgradeFacility()).to.be.revertedWithCustomError(
        refinery, "Cooldown");
      await time.increase(DAY + 1);
      await refinery.connect(alice).upgradeFacility(); // 50K STACK -> tier 3
      expect(await refinery.facilityTier(alice.address)).to.equal(3);
    });
  });

  describe("admin", () => {
    it("owner can pause, set fee, and withdraw entry fees to dev", async () => {
      const { refinery, dev, alice, bob } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });

      await refinery.pause();
      await expect(
        refinery.connect(bob).enterFacility("", { value: ENTRY_FEE })
      ).to.be.revertedWithCustomError(refinery, "EnforcedPause");
      await refinery.unpause();

      const before = await ethers.provider.getBalance(dev.address);
      await refinery.withdrawFees();
      expect(await ethers.provider.getBalance(dev.address)).to.equal(before + ENTRY_FEE);
    });
  });
});
