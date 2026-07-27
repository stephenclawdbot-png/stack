import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ENTRY_FEE = ethers.parseEther("0.001");
const DAY = 86_400;

describe("Stack Refinery", () => {
  async function deployFixture() {
    const [deployer, dev, alice, bob, carol] = await ethers.getSigners();

    const token = await (await ethers.getContractFactory("StackToken")).deploy(deployer.address);
    const nft = await (await ethers.getContractFactory("MinerNFT")).deploy();
    const refinery = await (
      await ethers.getContractFactory("StackRefinery")
    ).deploy(await token.getAddress(), await nft.getAddress(), dev.address);

    await token.setRefinery(await refinery.getAddress());
    await nft.setRefinery(await refinery.getAddress());

    return { token, nft, refinery, deployer, dev, alice, bob, carol };
  }

  describe("StackToken", () => {
    it("premints 5M to the deployer and tracks cap", async () => {
      const { token, deployer } = await loadFixture(deployFixture);
      expect(await token.balanceOf(deployer.address)).to.equal(ethers.parseEther("5000000"));
      expect(await token.totalMinted()).to.equal(ethers.parseEther("5000000"));
      expect(await token.remainingMintable()).to.equal(ethers.parseEther("95000000"));
    });

    it("only the refinery can mint; refinery wiring is one-shot", async () => {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.connect(alice).mint(alice.address, 1)).to.be.revertedWithCustomError(
        token,
        "NotRefinery"
      );
      await expect(token.setRefinery(alice.address)).to.be.revertedWithCustomError(
        token,
        "RefineryAlreadySet"
      );
    });

    it("burning counts against the cap (does not free supply)", async () => {
      const { token, deployer } = await loadFixture(deployFixture);
      await token.connect(deployer).burn(ethers.parseEther("1000000"));
      expect(await token.totalBurned()).to.equal(ethers.parseEther("1000000"));
      expect(await token.remainingMintable()).to.equal(ethers.parseEther("95000000"));
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
    it("sole miner earns the full emission rate", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });

      await time.increase(DAY);
      const pending = await refinery.pendingRewards(alice.address);
      // ~300K/day, integer rate truncation makes it slightly under
      expect(pending).to.be.closeTo(ethers.parseEther("300000"), ethers.parseEther("100"));
    });

    it("splits emission by hashrate share", async () => {
      const { refinery, alice, bob } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await refinery.connect(bob).enterFacility("", { value: ENTRY_FEE });

      await time.increase(DAY);
      const a = await refinery.pendingRewards(alice.address);
      const b = await refinery.pendingRewards(bob.address);
      // equal hashrate (1 each) => roughly equal share
      expect(a).to.be.closeTo(b, ethers.parseEther("10"));
    });

    it("halves the rate after HALVING_INTERVAL", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      const rate0 = await refinery.emissionRatePerSec();
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await time.increase(13_680_000);
      expect(await refinery.emissionRatePerSec()).to.equal(rate0 / 2n);
    });

    it("integrates piecewise across a halving boundary", async () => {
      const { refinery, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      // 1 day before the halving + 1 day after
      await time.increase(13_680_000 - DAY);
      const before = await refinery.pendingRewards(alice.address);
      await time.increase(2 * DAY);
      const after = await refinery.pendingRewards(alice.address);
      const twoDays = after - before;
      // day at full rate + day at half rate = 1.5 days of launch emission
      expect(twoDays).to.be.closeTo(ethers.parseEther("450000"), ethers.parseEther("200"));
    });
  });

  describe("claims and referrals", () => {
    it("pays 95.5% net with no referrer; carve-out stays in game", async () => {
      const { refinery, token, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await time.increase(DAY);

      await refinery.connect(alice).claimRewards();
      const bal = await token.balanceOf(alice.address);
      const gameBal = await token.balanceOf(await refinery.getAddress());
      const gross = bal + gameBal;
      expect(bal).to.be.closeTo((gross * 9550n) / 10_000n, ethers.parseEther("1"));
      expect(gameBal).to.be.closeTo((gross * 450n) / 10_000n, ethers.parseEther("1"));
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

      const tol = ethers.parseEther("20");
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

    it("rejects self-referral and 2-wallet loops", async () => {
      const { refinery, alice, bob } = await loadFixture(deployFixture);
      // codes can be created before entering
      await refinery.connect(alice).createReferralCode("alicecode");
      await expect(
        refinery.connect(alice).enterFacility("alicecode", { value: ENTRY_FEE })
      ).to.be.revertedWithCustomError(refinery, "SelfReferral");

      // 2-wallet loop: bob enters via alice's code, then alice tries to
      // enter via bob's code
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
      // fund alice from premint and approve the game
      await token.connect(deployer).transfer(alice.address, ethers.parseEther("200000"));
      await token.connect(alice).approve(await refinery.getAddress(), ethers.MaxUint256);
      return fx;
    }

    it("buyMiner burns 75% and banks 25%", async () => {
      const { refinery, token, nft, alice } = await fundedPlayer();
      const burnedBefore = await token.totalBurned();
      await refinery.connect(alice).buyMiner(1); // 100 STACK
      expect(await token.totalBurned()).to.equal(burnedBefore + ethers.parseEther("75"));
      expect(await token.balanceOf(await refinery.getAddress())).to.equal(ethers.parseEther("25"));
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
      // cell (1,0) occupied now
      await refinery.connect(alice).buyMiner(1);
      await expect(
        refinery.connect(alice).placeMiner(2, 1, 0)
      ).to.be.revertedWithCustomError(refinery, "CellOccupied");
    });

    it("enforces grid bounds and power limits", async () => {
      const { refinery, alice } = await fundedPlayer();
      await refinery.connect(alice).buyMiner(3); // 2x2 excavator
      // 2x2 grid: 2x2 rig at (1,1) would exceed bounds
      await expect(
        refinery.connect(alice).placeMiner(1, 1, 1)
      ).to.be.revertedWithCustomError(refinery, "OutOfBounds");
      // fits at (0,0)? hand drill occupies (0,0) => CellOccupied
      await expect(
        refinery.connect(alice).placeMiner(1, 0, 0)
      ).to.be.revertedWithCustomError(refinery, "CellOccupied");
      // power: T3 needs 20, starter site has 10 — buy T2 (power 8) at (1,0):
      await refinery.connect(alice).buyMiner(2);
      await refinery.connect(alice).placeMiner(2, 1, 0);
      // now 1+8=9 used of 10; T1 (power 3) at (0,1) exceeds
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
      // cell is free again
      await refinery.connect(alice).placeMiner(1, 1, 0);
    });
  });

  describe("facility upgrades", () => {
    it("upgrades tier with cost and cooldown", async () => {
      const { refinery, token, deployer, alice } = await loadFixture(deployFixture);
      await refinery.connect(alice).enterFacility("", { value: ENTRY_FEE });
      await token.connect(deployer).transfer(alice.address, ethers.parseEther("10000"));
      await token.connect(alice).approve(await refinery.getAddress(), ethers.MaxUint256);

      await refinery.connect(alice).upgradeFacility(); // 1000 STACK -> tier 2
      expect(await refinery.facilityTier(alice.address)).to.equal(2);
      expect(await refinery.facilityGridSize(alice.address)).to.equal(3);

      await expect(refinery.connect(alice).upgradeFacility()).to.be.revertedWithCustomError(
        refinery, "Cooldown");
      await time.increase(DAY + 1);
      await refinery.connect(alice).upgradeFacility(); // 5000 STACK -> tier 3
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
