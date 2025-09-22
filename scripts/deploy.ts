import { ethers } from "hardhat";
import { Contract } from "ethers";

interface DeploymentResult {
  balToken: Contract;
  election: Contract;
  balTokenAddress: string;
  electionAddress: string;
  network: string;
  deployer: string;
}

async function main(): Promise<DeploymentResult> {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

  console.log("\n📄 Deploying BalToken...");
  const BalToken = await ethers.getContractFactory("BalToken");
  const balToken = await BalToken.deploy(deployer.address);
  await balToken.waitForDeployment();
  const balTokenAddress = await balToken.getAddress();

  console.log("✅ BalToken deployed to:", balTokenAddress);

  console.log("\n📄 Deploying Election...");
  const Election = await ethers.getContractFactory("Election");
  const election = await Election.deploy(balTokenAddress, deployer.address);
  await election.waitForDeployment();
  const electionAddress = await election.getAddress();

  console.log("✅ Election deployed to:", electionAddress);

  console.log("\n🔗 Setting up permissions...");

  // Add election contract as authorized minter for BAL tokens
  const addMinterTx = await balToken.addMinter(electionAddress);
  await addMinterTx.wait();
  console.log("✅ Election contract added as BAL token minter");

  // Verify the setup
  const isAuthorizedMinter = await balToken.authorizedMinters(electionAddress);
  console.log("Election contract is authorized minter:", isAuthorizedMinter);

  console.log("\n📊 Deployment Summary:");
  console.log("========================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("BAL Token:", balTokenAddress);
  console.log("Election:", electionAddress);
  console.log("Gas Used: Varies by network");

  console.log("\n🎯 Next Steps:");
  console.log("1. Verify contracts on block explorer (if on testnet)");
  console.log("2. Create election using Election.createElection()");
  console.log("3. Add candidates using Election.addCandidate()");
  console.log("4. Generate voter Merkle tree and update root");
  console.log("5. Start the election!");

  return {
    balToken,
    election,
    balTokenAddress,
    electionAddress,
    network: network.name,
    deployer: deployer.address,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployContracts };
export type { DeploymentResult };