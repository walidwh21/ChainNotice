const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const FIRST_NOTICE = process.env.FIRST_NOTICE || "Welcome to the notice board.";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network   : ${network.name}`);
  console.log(`Deployer  : ${deployer.address}`);

  const factory = await ethers.getContractFactory("NoticeBoard");
  const board = await factory.deploy(FIRST_NOTICE);
  const receipt = await board.deploymentTransaction().wait();
  const address = await board.getAddress();

  console.log(`Contract  : ${address}`);
  console.log(`Tx hash   : ${receipt.hash}`);
  console.log(`Block     : ${receipt.blockNumber}`);

  // Keep a small record so other scripts and front-ends can find the contract.
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${network.name}.json`),
    JSON.stringify(
      { network: network.name, address, admin: deployer.address, txHash: receipt.hash, block: receipt.blockNumber },
      null,
      2
    ) + "\n"
  );
  console.log(`Saved     : deployments/${network.name}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
