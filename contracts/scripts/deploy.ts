import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const devWallet = process.env.DEV_WALLET || deployer.address;
  console.log("Deployer:", deployer.address);
  console.log("Dev wallet:", devWallet);

  const StackToken = await ethers.getContractFactory("StackToken");
  const token = await StackToken.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("StackToken:", await token.getAddress());

  const MinerNFT = await ethers.getContractFactory("MinerNFT");
  const nft = await MinerNFT.deploy();
  await nft.waitForDeployment();
  console.log("MinerNFT:", await nft.getAddress());

  const StackRefinery = await ethers.getContractFactory("StackRefinery");
  const refinery = await StackRefinery.deploy(
    await token.getAddress(),
    await nft.getAddress(),
    devWallet
  );
  await refinery.waitForDeployment();
  console.log("StackRefinery:", await refinery.getAddress());

  await (await token.setRefinery(await refinery.getAddress())).wait();
  await (await nft.setRefinery(await refinery.getAddress())).wait();
  console.log("Wiring complete.");

  console.log("\nPaste into frontend/src/config.ts ADDRESSES:");
  console.log(`  stackToken: "${await token.getAddress()}",`);
  console.log(`  minerNFT: "${await nft.getAddress()}",`);
  console.log(`  refinery: "${await refinery.getAddress()}",`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
