import hardhat from "hardhat";
import fs from "fs";

const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy GameItem
  const GameItem = await ethers.getContractFactory("GameItem");
  const gameItem = await GameItem.deploy();
  await gameItem.waitForDeployment();
  console.log("GameItem deployed to", await gameItem.getAddress());

  // Deploy Marketplace
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to", await marketplace.getAddress());

  // Mint some items to deployer for testing
  const tx = await gameItem.mint(deployer.address);
  await tx.wait();
  console.log("Minted token 0 to deployer");

  // Save addresses to a JSON for client easy access
  const addresses = {
    GameItem: await gameItem.getAddress(),
    Marketplace: await marketplace.getAddress(),
  };
  fs.writeFileSync(
    "../client/src/contract-address.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Saved addresses to client/src/contract-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});