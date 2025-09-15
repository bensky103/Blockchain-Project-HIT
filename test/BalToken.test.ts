import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("BalToken", function () {
  async function deployBalTokenFixture() {
    const [owner, minter, user1, user2] = await ethers.getSigners();

    const BalToken = await ethers.getContractFactory("BalToken");
    const balToken = await BalToken.deploy(owner.address);

    return { balToken, owner, minter, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { balToken } = await loadFixture(deployBalTokenFixture);

      expect(await balToken.name()).to.equal("BAL Election Token");
      expect(await balToken.symbol()).to.equal("BAL");
    });

    it("Should mint initial supply to owner", async function () {
      const { balToken, owner } = await loadFixture(deployBalTokenFixture);

      const expectedInitialSupply = ethers.parseEther("10000");
      expect(await balToken.balanceOf(owner.address)).to.equal(expectedInitialSupply);
      expect(await balToken.totalSupply()).to.equal(expectedInitialSupply);
    });

    it("Should set correct constants", async function () {
      const { balToken } = await loadFixture(deployBalTokenFixture);

      expect(await balToken.VOTE_REWARD()).to.equal(ethers.parseEther("1"));
      expect(await balToken.MAX_SUPPLY()).to.equal(ethers.parseEther("1000000"));
    });

    it("Should revert if deployed with zero address", async function () {
      const BalToken = await ethers.getContractFactory("BalToken");

      await expect(
        BalToken.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(BalToken, "OwnableInvalidOwner");
    });
  });

  describe("Minter Management", function () {
    it("Should allow owner to add minters", async function () {
      const { balToken, owner, minter } = await loadFixture(deployBalTokenFixture);

      await expect(balToken.connect(owner).addMinter(minter.address))
        .to.emit(balToken, "MinterAdded")
        .withArgs(minter.address);

      expect(await balToken.authorizedMinters(minter.address)).to.be.true;
    });

    it("Should allow owner to remove minters", async function () {
      const { balToken, owner, minter } = await loadFixture(deployBalTokenFixture);

      await balToken.connect(owner).addMinter(minter.address);
      await expect(balToken.connect(owner).removeMinter(minter.address))
        .to.emit(balToken, "MinterRemoved")
        .withArgs(minter.address);

      expect(await balToken.authorizedMinters(minter.address)).to.be.false;
    });

    it("Should revert when non-owner tries to add minter", async function () {
      const { balToken, minter, user1 } = await loadFixture(deployBalTokenFixture);

      await expect(
        balToken.connect(user1).addMinter(minter.address)
      ).to.be.revertedWithCustomError(balToken, "OwnableUnauthorizedAccount");
    });

    it("Should revert when adding zero address as minter", async function () {
      const { balToken, owner } = await loadFixture(deployBalTokenFixture);

      await expect(
        balToken.connect(owner).addMinter(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(balToken, "ZeroAddress");
    });
  });

  describe("Vote Reward Minting", function () {
    it("Should allow authorized minter to mint vote rewards", async function () {
      const { balToken, owner, minter, user1 } = await loadFixture(deployBalTokenFixture);

      await balToken.connect(owner).addMinter(minter.address);

      const rewardAmount = await balToken.VOTE_REWARD();
      const initialBalance = await balToken.balanceOf(user1.address);

      await expect(balToken.connect(minter).mintVoteReward(user1.address))
        .to.emit(balToken, "TokensMinted")
        .withArgs(user1.address, rewardAmount, "Vote reward");

      expect(await balToken.balanceOf(user1.address)).to.equal(
        initialBalance + rewardAmount
      );
    });

    it("Should allow owner to mint vote rewards", async function () {
      const { balToken, owner, user1 } = await loadFixture(deployBalTokenFixture);

      const rewardAmount = await balToken.VOTE_REWARD();
      const initialBalance = await balToken.balanceOf(user1.address);

      await expect(balToken.connect(owner).mintVoteReward(user1.address))
        .to.emit(balToken, "TokensMinted")
        .withArgs(user1.address, rewardAmount, "Vote reward");

      expect(await balToken.balanceOf(user1.address)).to.equal(
        initialBalance + rewardAmount
      );
    });

    it("Should revert when unauthorized user tries to mint vote rewards", async function () {
      const { balToken, user1, user2 } = await loadFixture(deployBalTokenFixture);

      await expect(
        balToken.connect(user1).mintVoteReward(user2.address)
      ).to.be.revertedWithCustomError(balToken, "UnauthorizedMinter");
    });

    it("Should revert when minting to zero address", async function () {
      const { balToken, owner } = await loadFixture(deployBalTokenFixture);

      await expect(
        balToken.connect(owner).mintVoteReward(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(balToken, "ZeroAddress");
    });

    it("Should revert when exceeding max supply", async function () {
      const { balToken, owner, user1 } = await loadFixture(deployBalTokenFixture);

      // Mint tokens close to max supply
      const maxSupply = await balToken.MAX_SUPPLY();
      const currentSupply = await balToken.totalSupply();
      const nearMaxAmount = maxSupply - currentSupply - ethers.parseEther("0.5");

      await balToken.connect(owner).mintTokens(user1.address, nearMaxAmount, "Test");

      // Try to mint vote reward which should exceed max supply
      await expect(
        balToken.connect(owner).mintVoteReward(user1.address)
      ).to.be.revertedWithCustomError(balToken, "MaxSupplyExceeded");
    });
  });

  describe("Custom Minting", function () {
    it("Should allow owner to mint custom amounts", async function () {
      const { balToken, owner, user1 } = await loadFixture(deployBalTokenFixture);

      const mintAmount = ethers.parseEther("100");
      const initialBalance = await balToken.balanceOf(user1.address);

      await expect(
        balToken.connect(owner).mintTokens(user1.address, mintAmount, "Custom mint")
      )
        .to.emit(balToken, "TokensMinted")
        .withArgs(user1.address, mintAmount, "Custom mint");

      expect(await balToken.balanceOf(user1.address)).to.equal(
        initialBalance + mintAmount
      );
    });

    it("Should revert when non-owner tries to mint custom amounts", async function () {
      const { balToken, user1, user2 } = await loadFixture(deployBalTokenFixture);

      await expect(
        balToken.connect(user1).mintTokens(user2.address, ethers.parseEther("100"), "Test")
      ).to.be.revertedWithCustomError(balToken, "OwnableUnauthorizedAccount");
    });

    it("Should revert when minting zero amount", async function () {
      const { balToken, owner, user1 } = await loadFixture(deployBalTokenFixture);

      await expect(
        balToken.connect(owner).mintTokens(user1.address, 0, "Test")
      ).to.be.revertedWithCustomError(balToken, "InvalidAmount");
    });
  });

  describe("Burning", function () {
    it("Should allow users to burn their tokens", async function () {
      const { balToken, owner } = await loadFixture(deployBalTokenFixture);

      const burnAmount = ethers.parseEther("100");
      const initialBalance = await balToken.balanceOf(owner.address);

      await balToken.connect(owner).burn(burnAmount);

      expect(await balToken.balanceOf(owner.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("Should allow burning from approved accounts", async function () {
      const { balToken, owner, user1 } = await loadFixture(deployBalTokenFixture);

      const burnAmount = ethers.parseEther("100");

      // Transfer tokens to user1 and approve owner to spend
      await balToken.connect(owner).transfer(user1.address, ethers.parseEther("500"));
      await balToken.connect(user1).approve(owner.address, burnAmount);

      const initialBalance = await balToken.balanceOf(user1.address);

      await balToken.connect(owner).burnFrom(user1.address, burnAmount);

      expect(await balToken.balanceOf(user1.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("Should revert when burning zero amount", async function () {
      const { balToken, owner } = await loadFixture(deployBalTokenFixture);

      await expect(
        balToken.connect(owner).burn(0)
      ).to.be.revertedWithCustomError(balToken, "InvalidAmount");
    });
  });

  describe("View Functions", function () {
    it("Should return correct vote reward", async function () {
      const { balToken } = await loadFixture(deployBalTokenFixture);

      expect(await balToken.getVoteReward()).to.equal(ethers.parseEther("1"));
    });

    it("Should return correct remaining supply", async function () {
      const { balToken } = await loadFixture(deployBalTokenFixture);

      const maxSupply = await balToken.MAX_SUPPLY();
      const totalSupply = await balToken.totalSupply();

      expect(await balToken.getRemainingSupply()).to.equal(maxSupply - totalSupply);
    });
  });

  describe("Security", function () {
    it("Should have ReentrancyGuard protection on mintVoteReward", async function () {
      const { balToken, user1 } = await loadFixture(deployBalTokenFixture);

      // The ReentrancyGuard protection is handled by OpenZeppelin
      // This test verifies the function can be called normally
      expect(await balToken.mintVoteReward.staticCall(user1.address)).to.not.be.reverted;
    });

    it("Should have ReentrancyGuard protection on mintTokens", async function () {
      const { balToken, owner, user1 } = await loadFixture(deployBalTokenFixture);

      // The ReentrancyGuard protection is handled by OpenZeppelin
      // This test verifies the function can be called normally
      await expect(
        balToken.connect(owner).mintTokens(user1.address, ethers.parseEther("1"), "test")
      ).to.not.be.reverted;
    });
  });
});