// Deploys a fresh board and walks through its whole lifecycle in one process.
// Run with:  npm run demo
const { ethers } = require("hardhat");

async function main() {
  const [admin, visitor] = await ethers.getSigners();
  const board = await (await ethers.getContractFactory("NoticeBoard")).deploy("Doors open at 9.");
  await board.waitForDeployment();
  console.log("Board deployed at", await board.getAddress());

  console.log("\n1) Admin pins two more notices");
  await (await board.pin("Lunch is served at noon.")).wait();
  await (await board.pin("Maintenance window tonight.")).wait();

  console.log("\n2) Anyone can read the history");
  const count = await board.total();
  for (let id = 0n; id < count; id++) {
    const n = await board.notice(id);
    console.log(`  #${id} ${n.text}`);
  }

  console.log("\n3) A visitor tries to pin a notice");
  try {
    await board.connect(visitor).pin("Free coffee for everyone!");
  } catch (err) {
    console.log("  rejected ->", err.message.match(/custom error '([^']+)'/)?.[1] ?? err.shortMessage);
  }

  console.log("\n4) Admin hands the board to the visitor");
  await (await board.transferAdmin(visitor.address)).wait();
  await (await board.connect(visitor).pin("New admin on duty.")).wait();
  console.log("  latest ->", (await board.latest()).text);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
