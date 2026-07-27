import { ethers, network } from "hardhat";

/**
 * Deploys MinerNFT + StackRefinery against an existing STACK token.
 *
 * Env (../.env.local):
 *   STACK_TOKEN_ADDRESS  address of the STACK token launched on ponz.family.
 *                        Required on mainnet. If unset on a test network,
 *                        a MockStack (1B fixed supply) is deployed instead.
 *   DEV_WALLET           fee/referral-remainder recipient (default: deployer)
 *   EMISSION_PER_DAY     whole STACK per day at launch (default: 3000000).
 *                        Set this based on how much STACK the treasury
 *                        actually holds — see BUILD.md.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const devWallet = process.env.DEV_WALLET || deployer.address;
  const emissionPerDay = BigInt(process.env.EMISSION_PER_DAY || "3000000");
  const ratePerSec = (emissionPerDay * 10n ** 18n) / 86400n;

  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Dev wallet:", devWallet);
  console.log("Emission:", emissionPerDay.toString(), "STACK/day");

  let tokenAddress = process.env.STACK_TOKEN_ADDRESS;
  if (!tokenAddress) {
    if (network.name === "robinhood") {
      throw new Error(
        "STACK_TOKEN_ADDRESS is required on mainnet — launch STACK on ponz.family first and put its address in ../.env.local"
      );
    }
    console.log("No STACK_TOKEN_ADDRESS set — deploying MockStack (1B supply)...");
    const mock = await (await ethers.getContractFactory("MockStack")).deploy();
    await mock.waitForDeployment();
    tokenAddress = await mock.getAddress();
    console.log("MockStack:", tokenAddress);
  }

  const nft = await (await ethers.getContractFactory("MinerNFT")).deploy();
  await nft.waitForDeployment();
  console.log("MinerNFT:", await nft.getAddress());

  const refinery = await (
    await ethers.getContractFactory("StackRefinery")
  ).deploy(tokenAddress, await nft.getAddress(), devWallet, ratePerSec);
  await refinery.waitForDeployment();
  console.log("StackRefinery:", await refinery.getAddress());

  await (await nft.setRefinery(await refinery.getAddress())).wait();
  console.log("Wiring complete.");

  console.log("\nNEXT: fund the reward pool, e.g. from the deployer wallet:");
  console.log(`  stackToken.transfer("${await refinery.getAddress()}", amount)`);
  console.log("\nPaste into frontend/src/config.ts ADDRESSES:");
  console.log(`  stackToken: "${tokenAddress}",`);
  console.log(`  minerNFT: "${await nft.getAddress()}",`);
  console.log(`  refinery: "${await refinery.getAddress()}",`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
