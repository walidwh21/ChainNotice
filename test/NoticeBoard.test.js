const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NoticeBoard", () => {
  async function deployBoard() {
    const [admin, visitor] = await ethers.getSigners();
    const board = await (await ethers.getContractFactory("NoticeBoard")).deploy("First notice");
    return { board, admin, visitor };
  }

  describe("deployment", () => {
    it("makes the deployer the admin", async () => {
      const { board, admin } = await loadFixture(deployBoard);
      expect(await board.admin()).to.equal(admin.address);
    });

    it("pins the first notice as #0", async () => {
      const { board, admin } = await loadFixture(deployBoard);
      const first = await board.notice(0);
      expect(first.text).to.equal("First notice");
      expect(first.author).to.equal(admin.address);
      expect(await board.total()).to.equal(1n);
    });

    it("rejects an empty first notice", async () => {
      const factory = await ethers.getContractFactory("NoticeBoard");
      await expect(factory.deploy("")).to.be.revertedWithCustomError(factory, "EmptyNotice");
    });
  });

  describe("pin", () => {
    it("appends a notice and keeps the history in order", async () => {
      const { board } = await loadFixture(deployBoard);
      await board.pin("Second");
      await board.pin("Third");
      expect(await board.total()).to.equal(3n);
      expect((await board.latest()).text).to.equal("Third");
      expect((await board.notice(1)).text).to.equal("Second");
    });

    it("emits NoticePinned with the new id", async () => {
      const { board, admin } = await loadFixture(deployBoard);
      await expect(board.pin("Hello")).to.emit(board, "NoticePinned").withArgs(1, admin.address, "Hello");
    });

    it("records the block timestamp", async () => {
      const { board } = await loadFixture(deployBoard);
      await board.pin("Timed");
      expect((await board.latest()).pinnedAt).to.equal(BigInt(await time.latest()));
    });

    it("rejects empty and oversized notices", async () => {
      const { board } = await loadFixture(deployBoard);
      await expect(board.pin("")).to.be.revertedWithCustomError(board, "EmptyNotice");
      await expect(board.pin("x".repeat(281)))
        .to.be.revertedWithCustomError(board, "NoticeTooLong")
        .withArgs(281, 280);
    });

    it("accepts a notice of exactly 280 bytes", async () => {
      const { board } = await loadFixture(deployBoard);
      await board.pin("y".repeat(280));
      expect((await board.latest()).text).to.have.lengthOf(280);
    });

    it("blocks everyone except the admin", async () => {
      const { board, visitor } = await loadFixture(deployBoard);
      await expect(board.connect(visitor).pin("Nope"))
        .to.be.revertedWithCustomError(board, "NotAdmin")
        .withArgs(visitor.address);
    });
  });

  describe("notice", () => {
    it("reverts for an id that does not exist", async () => {
      const { board } = await loadFixture(deployBoard);
      await expect(board.notice(5)).to.be.revertedWithCustomError(board, "UnknownNotice").withArgs(5);
    });
  });

  describe("transferAdmin", () => {
    it("moves the role and emits an event", async () => {
      const { board, admin, visitor } = await loadFixture(deployBoard);
      await expect(board.transferAdmin(visitor.address))
        .to.emit(board, "AdminTransferred")
        .withArgs(admin.address, visitor.address);
      expect(await board.admin()).to.equal(visitor.address);
      await board.connect(visitor).pin("Now I can post");
      await expect(board.pin("Old admin")).to.be.revertedWithCustomError(board, "NotAdmin");
    });

    it("refuses the zero address and non-admin callers", async () => {
      const { board, visitor } = await loadFixture(deployBoard);
      await expect(board.transferAdmin(ethers.ZeroAddress)).to.be.revertedWithCustomError(board, "ZeroAddress");
      await expect(board.connect(visitor).transferAdmin(visitor.address)).to.be.revertedWithCustomError(
        board,
        "NotAdmin"
      );
    });
  });
});
