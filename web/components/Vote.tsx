"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import { Copy, CheckCircle, AlertCircle, Loader2, ExternalLink, User, Trophy, Clock, Brain } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { updateLastTransaction } from "@/components/DebugPanel"

// Types based on OpenAPI specification
interface Candidate {
  id: number
  name: string
  description: string
  voteCount: number
  isActive: boolean
  questionnaireProfile: [number, number, number] // Economic, Social, Security policy scores (0-10)
}

interface MerkleProofData {
  proof: string[]
  found: boolean
}

interface TransactionResponse {
  success: boolean
  transactionHash: string
  blockNumber?: number
  gasUsed?: string
}

interface ElectionStatus {
  status: number // 0=Not Started, 1=Scheduled, 2=Active, 3=Ended, 4=Completed
  statusText: string
  isOpen: boolean
}

interface DeploymentConfig {
  network: string
  chainId: number
  contracts: {
    balToken: { address: string; txHash: string }
    election: { address: string; txHash: string }
  }
}

export default function Vote() {
  // State management
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [merkleProof, setMerkleProof] = useState<string[]>([])
  const [manualProofInput, setManualProofInput] = useState("")
  const [connectedAddress, setConnectedAddress] = useState<string>("")
  const [balBalance, setBalBalance] = useState<string>("0")
  const [hasVoted, setHasVoted] = useState(false)
  const [votedFor, setVotedFor] = useState<number | null>(null)
  const [electionStatus, setElectionStatus] = useState<ElectionStatus | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string>("")

  // Loading states
  const [loading, setLoading] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [loadingProof, setLoadingProof] = useState(false)
  const [voting, setVoting] = useState(false)
  const [quizVoting, setQuizVoting] = useState(false)

  // Error states
  const [error, setError] = useState<string>("")
  const [proofError, setProofError] = useState<string>("")

  const [quizAnswers, setQuizAnswers] = useState<[number, number, number]>([50, 50, 50])
  const [quizVoted, setQuizVoted] = useState(false)

  // Mock deployment config - in real implementation would load from deployments/<network>.json
  const deploymentConfig: DeploymentConfig = {
    network: "localhost",
    chainId: 31337,
    contracts: {
      balToken: {
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        txHash: "0x...",
      },
      election: {
        address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        txHash: "0x...",
      },
    },
  }

  // Mock connected wallet address - in real implementation would use wagmi useAccount
  useEffect(() => {
    // Simulate wallet connection
    setConnectedAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCandidates(),
        loadElectionStatus(),
        loadVotingStatus(),
        loadBalBalance(),
        loadMerkleProof(),
      ])
    } catch (err) {
      console.error("Failed to load initial data:", err)
      setError("Failed to load voting data. Please refresh the page.")
    }
  }

  const loadCandidates = async () => {
    setLoadingCandidates(true)
    try {
      // Mock API call - in real implementation would call /candidates/active endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockCandidates: Candidate[] = [
        {
          id: 1,
          name: "Alice Johnson",
          description: "Progressive candidate focused on economic reform and social justice.",
          voteCount: 42,
          isActive: true,
          questionnaireProfile: [8, 9, 4], // Economic: 8, Social: 9, Security: 4
        },
        {
          id: 2,
          name: "Bob Smith",
          description: "Conservative candidate emphasizing security and traditional values.",
          voteCount: 38,
          isActive: true,
          questionnaireProfile: [3, 2, 9], // Economic: 3, Social: 2, Security: 9
        },
        {
          id: 3,
          name: "Carol Davis",
          description: "Centrist candidate promoting balanced policies and bipartisan cooperation.",
          voteCount: 35,
          isActive: true,
          questionnaireProfile: [5, 5, 6], // Economic: 5, Social: 5, Security: 6
        },
      ]

      setCandidates(mockCandidates)
    } catch (err) {
      console.error("Failed to load candidates:", err)
      setError("Failed to load candidates")
    } finally {
      setLoadingCandidates(false)
    }
  }

  const loadElectionStatus = async () => {
    try {
      // Mock API call - in real implementation would call /election/status endpoint
      const mockStatus: ElectionStatus = {
        status: 2, // Active
        statusText: "Active",
        isOpen: true,
      }
      setElectionStatus(mockStatus)
    } catch (err) {
      console.error("Failed to load election status:", err)
    }
  }

  const loadVotingStatus = async () => {
    if (!connectedAddress) return

    try {
      // Mock API call - in real implementation would call /vote/status/{address} endpoint
      const mockVotingStatus = {
        hasVoted: false,
        candidateId: null,
      }

      setHasVoted(mockVotingStatus.hasVoted)
      setVotedFor(mockVotingStatus.candidateId)
    } catch (err) {
      console.error("Failed to load voting status:", err)
    }
  }

  const loadBalBalance = async () => {
    if (!connectedAddress) return

    try {
      // Mock API call - in real implementation would call /token/balance/{address} endpoint
      const mockBalance = "1000000000000000000" // 1 BAL in wei
      setBalBalance(mockBalance)
    } catch (err) {
      console.error("Failed to load BAL balance:", err)
    }
  }

  const loadMerkleProof = async () => {
    if (!connectedAddress) return

    setLoadingProof(true)
    setProofError("")

    try {
      // First try to load from /public/merkle.json
      const response = await fetch("/merkle.json")
      if (response.ok) {
        const merkleData = await response.json()
        const addressProof = merkleData.proofs?.[connectedAddress.toLowerCase()]

        if (addressProof) {
          setMerkleProof(addressProof)
          toast({
            title: "Merkle Proof Loaded",
            description: "Your voting eligibility proof has been automatically loaded.",
          })
          return
        }
      }

      // Fallback: try API endpoint
      const apiResponse = await fetch(`/api/merkle/proof/${connectedAddress}`)
      if (apiResponse.ok) {
        const proofData: MerkleProofData = await apiResponse.json()
        if (proofData.found) {
          setMerkleProof(proofData.proof)
          toast({
            title: "Merkle Proof Loaded",
            description: "Your voting eligibility proof has been loaded from the server.",
          })
          return
        }
      }

      // No proof found
      setProofError("No Merkle proof found for your address. You may need to enter it manually.")
    } catch (err) {
      console.error("Failed to load Merkle proof:", err)
      setProofError("Failed to load Merkle proof. Please enter it manually below.")
    } finally {
      setLoadingProof(false)
    }
  }

  const handleManualProofSubmit = () => {
    if (!manualProofInput.trim()) {
      setProofError("Please enter at least one proof element")
      toast({
        title: "Validation Error",
        description: "Please enter at least one proof element",
        variant: "destructive",
      })
      return
    }

    try {
      const proofArray = manualProofInput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          // Ensure proper hex format
          if (!line.startsWith("0x")) {
            return "0x" + line
          }
          return line
        })

      if (proofArray.length === 0) {
        setProofError("Please enter at least one proof element")
        return
      }

      // Validate hex format
      for (const proof of proofArray) {
        if (!/^0x[a-fA-F0-9]{64}$/.test(proof)) {
          setProofError(`Invalid proof format: ${proof}. Each proof must be a 64-character hex string.`)
          return
        }
      }

      setMerkleProof(proofArray)
      setProofError("")
      toast({
        title: "Merkle Proof Set Successfully",
        description: `Successfully set ${proofArray.length} proof elements.`,
      })
    } catch (err) {
      setProofError("Invalid proof format. Please check your input.")
      toast({
        title: "Invalid Proof Format",
        description: "Please check your input and try again.",
        variant: "destructive",
      })
    }
  }

  const handleVoteDirect = async () => {
    if (!selectedCandidate) {
      toast({
        title: "No Candidate Selected",
        description: "Please select a candidate to vote for.",
        variant: "destructive",
      })
      return
    }

    if (merkleProof.length === 0) {
      toast({
        title: "Missing Merkle Proof",
        description: "Please load or enter your Merkle proof to verify voting eligibility.",
        variant: "destructive",
      })
      return
    }

    setVoting(true)
    setError("")

    const pendingToast = toast({
      title: "Casting Your Vote...",
      description: "Transaction is being processed on the blockchain",
    })

    try {
      const voteRequest = {
        candidateId: selectedCandidate,
        proof: merkleProof,
      }

      console.log("[v0] Submitting direct vote:", voteRequest)

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock successful response
      const response: TransactionResponse = {
        success: true,
        transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: "84532",
      }

      if (response.success) {
        setLastTxHash(response.transactionHash)
        setHasVoted(true)
        setVotedFor(selectedCandidate)

        updateLastTransaction(response.transactionHash)

        // Update candidate vote count locally
        setCandidates((prev) =>
          prev.map((candidate) =>
            candidate.id === selectedCandidate ? { ...candidate, voteCount: candidate.voteCount + 1 } : candidate,
          ),
        )

        // Update BAL balance (add 1 BAL reward)
        const currentBalance = BigInt(balBalance)
        const reward = BigInt("1000000000000000000") // 1 BAL in wei
        setBalBalance((currentBalance + reward).toString())

        pendingToast.dismiss()
        toast({
          title: "Vote Cast Successfully! 🎉",
          description: `Your vote for ${candidates.find((c) => c.id === selectedCandidate)?.name} has been recorded. You received 1 BAL token as a reward.`,
        })
      } else {
        throw new Error("Vote transaction failed")
      }
    } catch (err: any) {
      console.error("Vote failed:", err)

      let errorMessage = "Failed to cast vote. Please try again."

      if (err.message?.includes("AlreadyVoted")) {
        errorMessage = "You have already voted in this election."
      } else if (err.message?.includes("InvalidMerkleProof")) {
        errorMessage = "Your Merkle proof is invalid. You are not eligible to vote."
      } else if (err.message?.includes("ElectionEndedError")) {
        errorMessage = "The voting period has ended."
      } else if (err.message?.includes("CandidateNotActive")) {
        errorMessage = "The selected candidate is no longer active."
      }

      setError(errorMessage)

      pendingToast.dismiss()
      toast({
        title: "Vote Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setVoting(false)
    }
  }

  const handleVoteByQuiz = async () => {
    if (merkleProof.length === 0) {
      toast({
        title: "Missing Merkle Proof",
        description: "Please load or enter your Merkle proof to verify voting eligibility.",
        variant: "destructive",
      })
      return
    }

    setQuizVoting(true)
    setError("")

    const pendingToast = toast({
      title: "Casting Quiz Vote...",
      description: "Processing your policy preferences and casting vote",
    })

    try {
      const voteRequest = {
        answers: quizAnswers,
        proof: merkleProof,
      }

      console.log("[v0] Submitting quiz vote:", voteRequest)

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock successful response
      const response: TransactionResponse = {
        success: true,
        transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: "84532",
      }

      if (response.success) {
        setLastTxHash(response.transactionHash)
        setHasVoted(true)
        setQuizVoted(true)

        updateLastTransaction(response.transactionHash)

        // Update BAL balance (add 1 BAL reward)
        const currentBalance = BigInt(balBalance)
        const reward = BigInt("1000000000000000000") // 1 BAL in wei
        setBalBalance((currentBalance + reward).toString())

        pendingToast.dismiss()
        toast({
          title: "Quiz Vote Cast Successfully! 🎉",
          description:
            "Your vote has been cast based on your policy preferences. You received 1 BAL token as a reward.",
        })
      } else {
        throw new Error("Vote transaction failed")
      }
    } catch (err: any) {
      console.error("Quiz vote failed:", err)

      let errorMessage = "Failed to cast vote. Please try again."

      if (err.message?.includes("AlreadyVoted")) {
        errorMessage = "You have already voted in this election."
      } else if (err.message?.includes("InvalidMerkleProof")) {
        errorMessage = "Your Merkle proof is invalid. You are not eligible to vote."
      } else if (err.message?.includes("ElectionEndedError")) {
        errorMessage = "The voting period has ended."
      }

      setError(errorMessage)

      pendingToast.dismiss()
      toast({
        title: "Quiz Vote Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setQuizVoting(false)
    }
  }

  const formatBalance = (balanceWei: string): string => {
    try {
      const balance = BigInt(balanceWei)
      const balanceEth = Number(balance) / 1e18
      return balanceEth.toFixed(2)
    } catch {
      return "0.00"
    }
  }

  const formatAddress = (address: string): string => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    })
  }

  const getPolicyScoreColor = (score: number): string => {
    if (score <= 3) return "bg-red-100 text-red-800"
    if (score <= 6) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  const getPolicyLabel = (index: number): string => {
    const labels = ["Economic Policy", "Social Issues", "Security Policy"]
    return labels[index] || "Unknown"
  }

  // Show error state if election is not active
  if (electionStatus && !electionStatus.isOpen) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Voting is currently {electionStatus.statusText.toLowerCase()}.
            {electionStatus.status === 0 && " The election has not started yet."}
            {electionStatus.status === 1 && " The election is scheduled but not yet active."}
            {electionStatus.status === 3 && " The voting period has ended."}
            {electionStatus.status === 4 && " The election is complete and results have been published."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Elections 2025 - Voting</h1>
        <p className="text-muted-foreground">
          Cast your vote directly for your preferred candidate or answer policy questions to find your best match.
        </p>
      </div>

      {/* Voting Status Banner */}
      {hasVoted && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {quizVoted ? (
              <>Your vote has been cast based on your policy preferences.</>
            ) : (
              <>
                You have successfully voted for <strong>{candidates.find((c) => c.id === votedFor)?.name}</strong>.
              </>
            )}
            {lastTxHash && (
              <span className="ml-2">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-green-700 hover:text-green-900"
                  onClick={() => window.open(`https://etherscan.io/tx/${lastTxHash}`, "_blank")}
                >
                  View Transaction <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Banner */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Voting Panel */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="direct-vote" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct-vote">Direct Vote</TabsTrigger>
              <TabsTrigger value="quiz-vote">Quiz Vote</TabsTrigger>
            </TabsList>

            <TabsContent value="direct-vote" className="space-y-6">
              {/* Candidates List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Select Your Candidate
                  </CardTitle>
                  <CardDescription>
                    Choose the candidate you want to vote for. You can see their policy positions below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCandidates ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-4 w-4 rounded" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-16" />
                              </div>
                              <Skeleton className="h-4 w-full" />
                              <div className="flex gap-2">
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-6 w-20" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedCandidate === candidate.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          } ${hasVoted ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => !hasVoted && setSelectedCandidate(candidate.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <h3 className="font-semibold">{candidate.name}</h3>
                                </div>
                                <Badge variant="secondary">{candidate.voteCount} votes</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{candidate.description}</p>

                              {/* Policy Positions */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Policy Positions (0-10 scale):
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.questionnaireProfile.map((score, index) => (
                                    <Badge key={index} variant="outline" className={getPolicyScoreColor(score)}>
                                      {getPolicyLabel(index)}: {score}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {selectedCandidate === candidate.id && (
                              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Merkle Proof Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Voting Eligibility Verification</CardTitle>
                  <CardDescription>
                    Your Merkle proof verifies that you are eligible to vote in this election.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingProof ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your voting eligibility proof...
                    </div>
                  ) : merkleProof.length > 0 ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✅ Merkle proof loaded successfully ({merkleProof.length} elements)
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {proofError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{proofError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="manual-proof">Manual Merkle Proof Entry</Label>
                        <Textarea
                          id="manual-proof"
                          placeholder="Enter your Merkle proof elements, one per line:&#10;0x1234567890abcdef...&#10;0xfedcba0987654321..."
                          value={manualProofInput}
                          onChange={(e) => setManualProofInput(e.target.value)}
                          rows={4}
                        />
                        <Button onClick={handleManualProofSubmit} variant="outline" size="sm">
                          Set Proof
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">How to get your Merkle proof:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Use the Merkle CLI tool provided by the election administrator</li>
                          <li>
                            Run:{" "}
                            <code className="bg-muted px-1 rounded">
                              merkle-cli generate-proof &lt;your-address&gt;
                            </code>
                          </li>
                          <li>Copy the proof elements and paste them above</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vote Button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleVoteDirect}
                    disabled={!selectedCandidate || merkleProof.length === 0 || voting || hasVoted}
                    className="w-full"
                    size="lg"
                  >
                    {voting ? (
                      <>
                        <Skeleton className="mr-2 h-4 w-4 rounded" />
                        Casting Vote...
                      </>
                    ) : hasVoted ? (
                      "Vote Already Cast"
                    ) : (
                      "Cast Your Vote"
                    )}
                  </Button>

                  {!hasVoted && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      By voting, you will receive 1 BAL token as a reward
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz-vote" className="space-y-6">
              {/* Quiz Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Policy Preference Quiz
                  </CardTitle>
                  <CardDescription>
                    Answer questions about your policy preferences. Your vote will be cast for the candidate whose
                    positions best match your answers. The candidate selection is done automatically and privately.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Quiz Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Policy Questions</CardTitle>
                  <CardDescription>
                    Rate your position on each policy area from 0 (strongly disagree) to 100 (strongly agree).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Economic Policy Question */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Economic Policy</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        "The government should increase spending on social programs and raise taxes on wealthy
                        individuals and corporations to reduce income inequality."
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Strongly Disagree</span>
                        <span>Neutral</span>
                        <span>Strongly Agree</span>
                      </div>
                      <Slider
                        value={[quizAnswers[0]]}
                        onValueChange={(value) => setQuizAnswers([value[0], quizAnswers[1], quizAnswers[2]])}
                        max={100}
                        step={1}
                        className="w-full"
                        disabled={hasVoted}
                      />
                      <div className="text-center">
                        <Badge variant="outline" className="text-sm">
                          {quizAnswers[0]}/100
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Social Issues Question */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Social Issues</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        "The government should expand civil liberties, support progressive social policies, and increase
                        funding for education and healthcare."
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Strongly Disagree</span>
                        <span>Neutral</span>
                        <span>Strongly Agree</span>
                      </div>
                      <Slider
                        value={[quizAnswers[1]]}
                        onValueChange={(value) => setQuizAnswers([quizAnswers[0], value[0], quizAnswers[2]])}
                        max={100}
                        step={1}
                        className="w-full"
                        disabled={hasVoted}
                      />
                      <div className="text-center">
                        <Badge variant="outline" className="text-sm">
                          {quizAnswers[1]}/100
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Security Policy Question */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Security Policy</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        "The government should prioritize national security, increase defense spending, and implement
                        stronger law enforcement measures to ensure public safety."
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Strongly Disagree</span>
                        <span>Neutral</span>
                        <span>Strongly Agree</span>
                      </div>
                      <Slider
                        value={[quizAnswers[2]]}
                        onValueChange={(value) => setQuizAnswers([quizAnswers[0], quizAnswers[1], value[0]])}
                        max={100}
                        step={1}
                        className="w-full"
                        disabled={hasVoted}
                      />
                      <div className="text-center">
                        <Badge variant="outline" className="text-sm">
                          {quizAnswers[2]}/100
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Merkle Proof Section for Quiz */}
              <Card>
                <CardHeader>
                  <CardTitle>Voting Eligibility Verification</CardTitle>
                  <CardDescription>
                    Your Merkle proof verifies that you are eligible to vote in this election.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingProof ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your voting eligibility proof...
                    </div>
                  ) : merkleProof.length > 0 ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✅ Merkle proof loaded successfully ({merkleProof.length} elements)
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {proofError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{proofError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="manual-proof-quiz">Manual Merkle Proof Entry</Label>
                        <Textarea
                          id="manual-proof-quiz"
                          placeholder="Enter your Merkle proof elements, one per line:&#10;0x1234567890abcdef...&#10;0xfedcba0987654321..."
                          value={manualProofInput}
                          onChange={(e) => setManualProofInput(e.target.value)}
                          rows={4}
                        />
                        <Button onClick={handleManualProofSubmit} variant="outline" size="sm">
                          Set Proof
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quiz Vote Button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleVoteByQuiz}
                    disabled={merkleProof.length === 0 || quizVoting || hasVoted}
                    className="w-full"
                    size="lg"
                  >
                    {quizVoting ? (
                      <>
                        <Skeleton className="mr-2 h-4 w-4 rounded" />
                        Casting Vote...
                      </>
                    ) : hasVoted ? (
                      "Vote Already Cast"
                    ) : (
                      "Cast Vote Based on Quiz"
                    )}
                  </Button>

                  {!hasVoted && (
                    <div className="space-y-2 mt-4">
                      <p className="text-xs text-muted-foreground text-center">
                        Your candidate will be selected automatically based on policy alignment
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        By voting, you will receive 1 BAL token as a reward
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wallet Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Connected Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">{formatAddress(connectedAddress)}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(connectedAddress)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">BAL Token Balance</Label>
                <div className="text-2xl font-bold text-primary mt-1">{formatBalance(balBalance)} BAL</div>
              </div>

              <div>
                <Label className="text-sm font-medium">Voting Status</Label>
                <div className="mt-1">
                  {hasVoted ? (
                    <Badge className="bg-green-100 text-green-800">✅ Voted</Badge>
                  ) : (
                    <Badge variant="outline">⏳ Not Voted</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Election Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Election Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {electionStatus && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={electionStatus.isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {electionStatus.statusText}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {electionStatus.isOpen ? "Voting is currently open" : "Voting is not available"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contract Information</CardTitle>
              <CardDescription>
                Deployed contracts on {deploymentConfig.network} (Chain ID: {deploymentConfig.chainId})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Election Contract</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                    {deploymentConfig.contracts.election.address}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(deploymentConfig.contracts.election.address)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">BAL Token Contract</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                    {deploymentConfig.contracts.balToken.address}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(deploymentConfig.contracts.balToken.address)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Receipt */}
          {lastTxHash && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Transaction Hash</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1">{formatAddress(lastTxHash)}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://etherscan.io/tx/${lastTxHash}`, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
