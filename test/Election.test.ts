import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { MerkleTreeHelper } from "./utils/merkleTree";

describe("Election", function () {
  async function deployElectionFixture() {
    const [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

    // Deploy BalToken first
    const BalToken = await ethers.getContractFactory("BalToken");
    const balToken = await BalToken.deploy(owner.address);

    // Deploy Election contract
    const Election = await ethers.getContractFactory("Election");
    const election = await Election.deploy(await balToken.getAddress(), owner.address);

    // Add election contract as minter
    await balToken.connect(owner).addMinter(await election.getAddress());

    // Create Merkle tree for voters
    const voters = [voter1.address, voter2.address, voter3.address];
    const merkleTree = MerkleTreeHelper.createFromAddresses(voters);

    return {
      election,
      balToken,
      owner,
      voter1,
      voter2,
      voter3,
      nonVoter,
      voters,
      merkleTree,
    };
  }

  async function deployWithElectionFixture() {
    const fixture = await deployElectionFixture();
    const { election, owner, merkleTree } = fixture;

    // Create an election
    const now = await time.latest();
    const startTime = now + 7200; // 2 hours from now (must be > 1 hour)
    const endTime = startTime + 86400; // 24 hours duration

    await election.connect(owner).createElection(
      "Test Election 2025",
      "A test election for the voting system",
      startTime,
      endTime,
      merkleTree.getRoot(),
      false // questionnaire disabled for basic tests
    );

    // Add some candidates
    await election.connect(owner).addCandidate(
      "Alice Johnson",
      "Experienced leader with vision",
      [5, 7, 3] // questionnaire profile
    );

    await election.connect(owner).addCandidate(
      "Bob Smith",
      "Young innovator with fresh ideas",
      [8, 4, 6]
    );

    return { ...fixture, startTime, endTime };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { election, balToken, owner } = await loadFixture(deployElectionFixture);

      expect(await election.owner()).to.equal(owner.address);
      expect(await election.balToken()).to.equal(await balToken.getAddress());
      expect(await election.candidateCount()).to.equal(0);
      expect(await election.totalVotes()).to.equal(0);

      const config = await election.getElectionInfo();
      expect(config.isActive).to.be.false;
    });

    it("Should revert if deployed with zero addresses", async function () {
      const [owner] = await ethers.getSigners();
      const BalToken = await ethers.getContractFactory("BalToken");
      const balToken = await BalToken.deploy(owner.address);

      const Election = await ethers.getContractFactory("Election");

      await expect(
        Election.deploy(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(Election, "ZeroAddress");

      await expect(
        Election.deploy(await balToken.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(Election, "OwnableInvalidOwner");
    });
  });

  describe("Election Creation", function () {
    it("Should create election with correct parameters", async function () {
      const { election, owner, merkleTree } = await loadFixture(deployElectionFixture);

      const now = await time.latest();
      const startTime = now + 7200; // 2 hours from now (must be > 1 hour)
      const endTime = startTime + 86400;

      await expect(
        election.connect(owner).createElection(
          "Test Election 2025",
          "A test election",
          startTime,
          endTime,
          merkleTree.getRoot(),
          true
        )
      )
        .to.emit(election, "ElectionCreated")
        .withArgs("Test Election 2025", startTime, endTime);

      const config = await election.getElectionInfo();
      expect(config.name).to.equal("Test Election 2025");
      expect(config.description).to.equal("A test election");
      expect(config.startTime).to.equal(startTime);
      expect(config.endTime).to.equal(endTime);
      expect(config.voterMerkleRoot).to.equal(merkleTree.getRoot());
      expect(config.isActive).to.be.true;
      expect(config.questionnaireEnabled).to.be.true;
    });

    it("Should revert with invalid time parameters", async function () {
      const { election, owner, merkleTree } = await loadFixture(deployElectionFixture);

      const now = await time.latest();

      // Start time too soon
      await expect(
        election.connect(owner).createElection(
          "Test Election",
          "Test",
          now + 1800, // 30 minutes from now
          now + 3600,
          merkleTree.getRoot(),
          false
        )
      ).to.be.revertedWithCustomError(election, "InvalidTimeFrame");

      // End time before start time
      await expect(
        election.connect(owner).createElection(
          "Test Election",
          "Test",
          now + 7200,
          now + 3600,
          merkleTree.getRoot(),
          false
        )
      ).to.be.revertedWithCustomError(election, "InvalidTimeFrame");

      // Duration too short
      await expect(
        election.connect(owner).createElection(
          "Test Election",
          "Test",
          now + 3600,
          now + 3600 + 1800, // 30 minutes duration
          merkleTree.getRoot(),
          false
        )
      ).to.be.revertedWithCustomError(election, "InvalidTimeFrame");
    });

    it("Should revert with empty name or zero merkle root", async function () {
      const { election, owner } = await loadFixture(deployElectionFixture);

      const now = await time.latest();
      const startTime = now + 7200; // 2 hours from now (must be > 1 hour)
      const endTime = startTime + 86400;

      await expect(
        election.connect(owner).createElection(
          "",
          "Test",
          startTime,
          endTime,
          ethers.ZeroHash,
          false
        )
      ).to.be.revertedWithCustomError(election, "EmptyString");

      await expect(
        election.connect(owner).createElection(
          "Test",
          "Test",
          startTime,
          endTime,
          ethers.ZeroHash,
          false
        )
      ).to.be.revertedWithCustomError(election, "InvalidMerkleProof");
    });
  });

  describe("Candidate Management", function () {
    it("Should add candidates correctly", async function () {
      const { election, owner } = await loadFixture(deployWithElectionFixture);

      const candidate = await election.getCandidate(1);
      expect(candidate.name).to.equal("Alice Johnson");
      expect(candidate.description).to.equal("Experienced leader with vision");
      expect(candidate.voteCount).to.equal(0);
      expect(candidate.isActive).to.be.true;
      expect(candidate.questionnaireProfile).to.deep.equal([5, 7, 3]);

      expect(await election.candidateCount()).to.equal(2);
    });

    it("Should update candidates", async function () {
      const { election, owner } = await loadFixture(deployWithElectionFixture);

      await expect(
        election.connect(owner).updateCandidate(
          1,
          "Alice Johnson Updated",
          "Updated description",
          [6, 8, 4]
        )
      )
        .to.emit(election, "CandidateUpdated")
        .withArgs(1, "Alice Johnson Updated");

      const candidate = await election.getCandidate(1);
      expect(candidate.name).to.equal("Alice Johnson Updated");
      expect(candidate.description).to.equal("Updated description");
      expect(candidate.questionnaireProfile).to.deep.equal([6, 8, 4]);
    });

    it("Should deactivate candidates", async function () {
      const { election, owner } = await loadFixture(deployWithElectionFixture);

      await expect(election.connect(owner).deactivateCandidate(1))
        .to.emit(election, "CandidateDeactivated")
        .withArgs(1);

      const candidate = await election.getCandidate(1);
      expect(candidate.isActive).to.be.false;
    });

    it("Should prevent adding candidates after election starts", async function () {
      const { election, owner, startTime } = await loadFixture(deployWithElectionFixture);

      await time.increaseTo(startTime);

      await expect(
        election.connect(owner).addCandidate("Late Candidate", "Too late", [5, 5, 5])
      ).to.be.revertedWithCustomError(election, "VotingPeriodActive");
    });

    it("Should validate questionnaire profiles", async function () {
      const { election, owner, merkleTree } = await loadFixture(deployElectionFixture);

      const now = await time.latest();
      const startTime = now + 7200; // 2 hours from now (must be > 1 hour)
      const endTime = startTime + 86400;

      await election.connect(owner).createElection(
        "Test Election",
        "Test",
        startTime,
        endTime,
        merkleTree.getRoot(),
        true // questionnaire enabled
      );

      // Invalid questionnaire profile (value > 10)
      await expect(
        election.connect(owner).addCandidate("Invalid Candidate", "Test", [5, 11, 3])
      ).to.be.revertedWithCustomError(election, "InvalidQuestionnaire");
    });
  });

  describe("Voting", function () {
    it("Should allow eligible voters to vote", async function () {
      const { election, balToken, voter1, merkleTree, startTime } =
        await loadFixture(deployWithElectionFixture);

      await time.increaseTo(startTime);

      const proof = merkleTree.getProof(voter1.address);
      const initialBalance = await balToken.balanceOf(voter1.address);

      await expect(
        election.connect(voter1).vote(1, proof, [5, 7, 3])
      )
        .to.emit(election, "VoteCast")
        .withArgs(voter1.address, 1, false);

      expect(await election.hasVoted(voter1.address)).to.be.true;
      expect(await election.voterToCandidate(voter1.address)).to.equal(1);
      expect(await election.totalVotes()).to.equal(1);

      const candidate = await election.getCandidate(1);
      expect(candidate.voteCount).to.equal(1);

      // Check BAL token reward
      const voteReward = await balToken.VOTE_REWARD();
      expect(await balToken.balanceOf(voter1.address)).to.equal(
        initialBalance + voteReward
      );
    });

    it("Should prevent double voting", async function () {
      const { election, voter1, merkleTree, startTime } =
        await loadFixture(deployWithElectionFixture);

      await time.increaseTo(startTime);

      const proof = merkleTree.getProof(voter1.address);

      await election.connect(voter1).vote(1, proof, [5, 7, 3]);

      await expect(
        election.connect(voter1).vote(2, proof, [5, 7, 3])
      ).to.be.revertedWithCustomError(election, "AlreadyVoted");
    });

    it("Should prevent voting with invalid merkle proof", async function () {
      const { election, nonVoter, merkleTree, startTime } =
        await loadFixture(deployWithElectionFixture);

      await time.increaseTo(startTime);

      // Use valid voter's proof for invalid voter
      const proof = merkleTree.getProof(merkleTree.leaves[0]);

      await expect(
        election.connect(nonVoter).vote(1, proof, [5, 7, 3])
      ).to.be.revertedWithCustomError(election, "InvalidMerkleProof");
    });

    it("Should prevent voting for inactive candidates", async function () {
      const { election, owner, voter1, merkleTree, startTime } =
        await loadFixture(deployWithElectionFixture);

      await election.connect(owner).deactivateCandidate(1);
      await time.increaseTo(startTime);

      const proof = merkleTree.getProof(voter1.address);

      await expect(
        election.connect(voter1).vote(1, proof, [5, 7, 3])
      ).to.be.revertedWithCustomError(election, "CandidateNotActive");
    });

    it("Should prevent voting outside election period", async function () {
      const { election, voter1, merkleTree, endTime } =
        await loadFixture(deployWithElectionFixture);

      const proof = merkleTree.getProof(voter1.address);

      // Before election starts
      await expect(
        election.connect(voter1).vote(1, proof, [5, 7, 3])
      ).to.be.revertedWithCustomError(election, "ElectionNotStarted");

      // After election ends
      await time.increaseTo(endTime + 1);
      await expect(
        election.connect(voter1).vote(1, proof, [5, 7, 3])
      ).to.be.revertedWithCustomError(election, "ElectionEndedError");
    });
  });

  describe("Anonymous Voting", function () {
    async function deployWithQuestionnaireElection() {
      const fixture = await deployElectionFixture();
      const { election, owner, merkleTree } = fixture;

      const now = await time.latest();
      const startTime = now + 7200; // 2 hours from now (must be > 1 hour)
      const endTime = startTime + 86400;

      await election.connect(owner).createElection(
        "Questionnaire Election",
        "Election with questionnaire matching",
        startTime,
        endTime,
        merkleTree.getRoot(),
        true // questionnaire enabled
      );

      // Add candidates with different profiles
      await election.connect(owner).addCandidate(
        "Candidate A",
        "Profile [2, 3, 4]",
        [2, 3, 4]
      );

      await election.connect(owner).addCandidate(
        "Candidate B",
        "Profile [7, 8, 9]",
        [7, 8, 9]
      );

      return { ...fixture, startTime, endTime };
    }

    it("Should allow anonymous voting with questionnaire matching", async function () {
      const { election, voter1, merkleTree, startTime } =
        await loadFixture(deployWithQuestionnaireElection);

      await time.increaseTo(startTime);

      const proof = merkleTree.getProof(voter1.address);
      const voterProfile: [number, number, number] = [3, 2, 5]; // Closer to Candidate A

      await expect(
        election.connect(voter1).voteAnonymous(proof, voterProfile)
      )
        .to.emit(election, "VoteCast")
        .withArgs(voter1.address, 1, true); // Should match Candidate A

      expect(await election.hasVoted(voter1.address)).to.be.true;

      const candidateA = await election.getCandidate(1);
      expect(candidateA.voteCount).to.equal(1);
    });

    it("Should calculate L1 distance correctly", async function () {
      const { election, voter1, merkleTree, startTime } =
        await loadFixture(deployWithQuestionnaireElection);

      await time.increaseTo(startTime);

      const proof = merkleTree.getProof(voter1.address);
      const voterProfile: [number, number, number] = [8, 9, 8]; // Closer to Candidate B

      await election.connect(voter1).voteAnonymous(proof, voterProfile);

      const candidateB = await election.getCandidate(2);
      expect(candidateB.voteCount).to.equal(1);
    });

    it("Should revert anonymous voting when questionnaire disabled", async function () {
      const { election, voter1, merkleTree, startTime } =
        await loadFixture(deployWithElectionFixture);

      await time.increaseTo(startTime);

      const proof = merkleTree.getProof(voter1.address);

      await expect(
        election.connect(voter1).voteAnonymous(proof, [5, 5, 5])
      ).to.be.revertedWithCustomError(election, "InvalidQuestionnaire");
    });
  });

  describe("Election Management", function () {
    it("Should end election after voting period", async function () {
      const { election, owner, endTime } = await loadFixture(deployWithElectionFixture);

      await time.increaseTo(endTime + 1);

      await expect(election.connect(owner).endElection())
        .to.emit(election, "ElectionEnded")
        .withArgs(0);

      const config = await election.getElectionInfo();
      expect(config.isActive).to.be.false;
    });

    it("Should publish results after election ends", async function () {
      const { election, owner, endTime } = await loadFixture(deployWithElectionFixture);

      await time.increaseTo(endTime + 1);
      await election.connect(owner).endElection();

      await expect(election.connect(owner).publishResults())
        .to.emit(election, "ResultsPublished");

      const config = await election.getElectionInfo();
      expect(config.resultsPublished).to.be.true;
    });

    it("Should update voter merkle root before election", async function () {
      const { election, owner, voters } = await loadFixture(deployElectionFixture);

      const newVoters = [...voters, ethers.Wallet.createRandom().address];
      const newMerkleTree = MerkleTreeHelper.createFromAddresses(newVoters);

      await expect(
        election.connect(owner).updateVoterMerkleRoot(newMerkleTree.getRoot())
      )
        .to.emit(election, "VoterMerkleRootUpdated")
        .withArgs(newMerkleTree.getRoot());

      const config = await election.getElectionInfo();
      expect(config.voterMerkleRoot).to.equal(newMerkleTree.getRoot());
    });
  });

  describe("View Functions", function () {
    it("Should return all candidates", async function () {
      const { election } = await loadFixture(deployWithElectionFixture);

      const allCandidates = await election.getAllCandidates();
      expect(allCandidates).to.have.length(2);
      expect(allCandidates[0].name).to.equal("Alice Johnson");
      expect(allCandidates[1].name).to.equal("Bob Smith");
    });

    it("Should return only active candidates", async function () {
      const { election, owner } = await loadFixture(deployWithElectionFixture);

      await election.connect(owner).deactivateCandidate(1);

      const activeCandidates = await election.getActiveCandidates();
      expect(activeCandidates).to.have.length(1);
      expect(activeCandidates[0].name).to.equal("Bob Smith");
    });

    it("Should return election status", async function () {
      const { election, startTime, endTime } = await loadFixture(deployWithElectionFixture);

      expect(await election.getElectionStatus()).to.equal("Scheduled");

      await time.increaseTo(startTime);
      expect(await election.getElectionStatus()).to.equal("Active");

      await time.increaseTo(endTime + 1);
      expect(await election.getElectionStatus()).to.equal("Ended - Results Pending");
    });

    it("Should validate eligible voters", async function () {
      const { election, voter1, nonVoter, merkleTree } =
        await loadFixture(deployWithElectionFixture);

      const validProof = merkleTree.getProof(voter1.address);
      const invalidProof = merkleTree.getProof(nonVoter.address);

      expect(
        await election.isEligibleVoter(voter1.address, validProof)
      ).to.be.true;

      expect(
        await election.isEligibleVoter(nonVoter.address, invalidProof)
      ).to.be.false;
    });
  });

  describe("Results and Ranking", function () {
    it("Should return ranked results after election", async function () {
      const { election, owner, voter1, voter2, merkleTree, startTime, endTime } =
        await loadFixture(deployWithElectionFixture);

      await time.increaseTo(startTime);

      // Vote for different candidates
      const proof1 = merkleTree.getProof(voter1.address);
      const proof2 = merkleTree.getProof(voter2.address);

      await election.connect(voter1).vote(2, proof1, [5, 5, 5]); // Vote for Bob
      await election.connect(voter2).vote(2, proof2, [5, 5, 5]); // Vote for Bob

      await time.increaseTo(endTime + 1);
      await election.connect(owner).endElection();
      await election.connect(owner).publishResults();

      const [candidateIds, voteCounts] = await election.getRankedResults();

      expect(candidateIds[0]).to.equal(2); // Bob should be first (2 votes)
      expect(candidateIds[1]).to.equal(1); // Alice should be second (0 votes)
      expect(voteCounts[0]).to.equal(2);
      expect(voteCounts[1]).to.equal(0);
    });
  });
});