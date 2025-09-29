"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, Users, Settings, Plus, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { updateLastTransaction } from "@/components/DebugPanel"

// Types based on OpenAPI specification
interface ElectionConfig {
  name: string
  description: string
  startTime: number
  endTime: number
  maxCandidates: number
  voterMerkleRoot: string
  isActive: boolean
  resultsPublished: boolean
  questionnaireEnabled: boolean
}

interface Candidate {
  id: number
  name: string
  description: string
  voteCount: number
  isActive: boolean
  questionnaireProfile: [number, number, number]
}

interface DeploymentConfig {
  network: string
  chainId: string
  deployer: string
  contracts: {
    balToken: { address: string; txHash: string }
    election: { address: string; txHash: string }
  }
  configuration: {
    voteReward: string
    merkleRoot: string
  }
}

export default function Admin() {
  const { toast } = useToast()

  // State management
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig | null>(null)
  const [electionConfig, setElectionConfig] = useState<ElectionConfig | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  // Form states
  const [electionForm, setElectionForm] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    merkleRoot: "",
    questionnaireEnabled: false,
  })

  const [candidateForm, setCandidateForm] = useState({
    name: "",
    description: "",
    topic1: 5,
    topic2: 5,
    topic3: 5,
  })

  const [merkleRootInput, setMerkleRootInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Load deployment configuration
  useEffect(() => {
    loadDeploymentConfig()
    checkOwnerStatus()
    loadElectionData()
  }, [])

  const loadDeploymentConfig = async () => {
    try {
      // In a real implementation, this would load from deployments/<network>.json
      // For now, we'll simulate the structure
      const mockConfig: DeploymentConfig = {
        network: "hardhat",
        chainId: "31337",
        deployer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
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
        configuration: {
          voteReward: "1000000000000000000", // 1 BAL
          merkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
      }
      setDeploymentConfig(mockConfig)
    } catch (err) {
      setError("Failed to load deployment configuration")
    }
  }

  const checkOwnerStatus = async () => {
    try {
      // In a real implementation, this would check if connected wallet is contract owner
      // For demo purposes, we'll simulate this
      setIsOwner(true)
    } catch (err) {
      setIsOwner(false)
      setError("Failed to verify owner status")
    }
  }

  const loadElectionData = async () => {
    try {
      // Mock election data - in real implementation would call contract
      const mockElection: ElectionConfig = {
        name: "",
        description: "",
        startTime: 0,
        endTime: 0,
        maxCandidates: 100,
        voterMerkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
        isActive: false,
        resultsPublished: false,
        questionnaireEnabled: false,
      }
      setElectionConfig(mockElection)

      // Mock candidates data
      setCandidates([])
    } catch (err) {
      setError("Failed to load election data")
    }
  }

  const handleCreateElection = async () => {
    if (!isOwner) {
      toast({
        title: "Access Denied",
        description: "Only the contract owner can create elections",
        variant: "destructive",
      })
      return
    }

    if (!electionForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Election name is required",
        variant: "destructive",
      })
      return
    }

    if (!electionForm.startTime || !electionForm.endTime) {
      toast({
        title: "Validation Error",
        description: "Start time and end time are required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError("")

    const pendingToast = toast({
      title: "Creating Election...",
      description: "Transaction is being processed",
    })

    try {
      // Validate form
      const startTime = new Date(electionForm.startTime).getTime() / 1000
      const endTime = new Date(electionForm.endTime).getTime() / 1000
      const now = Date.now() / 1000

      if (startTime <= now + 3600) {
        throw new Error("Start time must be at least 1 hour in the future")
      }

      if (endTime <= startTime) {
        throw new Error("End time must be after start time")
      }

      if (electionForm.merkleRoot && !electionForm.merkleRoot.match(/^0x[a-fA-F0-9]{64}$/)) {
        throw new Error("Invalid Merkle root format. Must be a 64-character hex string starting with 0x")
      }

      console.log("[v0] Creating election:", {
        name: electionForm.name,
        description: electionForm.description,
        startTime,
        endTime,
        merkleRoot: electionForm.merkleRoot || "0x0000000000000000000000000000000000000000000000000000000000000000",
        questionnaireEnabled: electionForm.questionnaireEnabled,
      })

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock successful response
      const txHash = "0x" + Math.random().toString(16).substr(2, 64)

      updateLastTransaction(txHash)

      pendingToast.dismiss()
      toast({
        title: "Election Created Successfully!",
        description: `Transaction hash: ${txHash.slice(0, 10)}...`,
      })

      // Reset form
      setElectionForm({
        name: "",
        description: "",
        startTime: "",
        endTime: "",
        merkleRoot: "",
        questionnaireEnabled: false,
      })
    } catch (err) {
      pendingToast.dismiss()
      const errorMessage = err instanceof Error ? err.message : "Failed to create election"
      setError(errorMessage)
      toast({
        title: "Election Creation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCandidate = async () => {
    if (!isOwner) {
      toast({
        title: "Access Denied",
        description: "Only the contract owner can add candidates",
        variant: "destructive",
      })
      return
    }

    if (!candidateForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Candidate name is required",
        variant: "destructive",
      })
      return
    }

    if (candidateForm.name.length > 100) {
      toast({
        title: "Validation Error",
        description: "Candidate name must be less than 100 characters",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError("")

    const pendingToast = toast({
      title: "Adding Candidate...",
      description: "Transaction is being processed",
    })

    try {
      // Validate topic scores (0-10 range)
      const topics = [candidateForm.topic1, candidateForm.topic2, candidateForm.topic3]
      if (topics.some((score) => score < 0 || score > 10)) {
        throw new Error("Topic scores must be between 0 and 10")
      }

      console.log("[v0] Adding candidate:", {
        name: candidateForm.name,
        description: candidateForm.description,
        questionnaireProfile: topics,
      })

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock successful response
      const txHash = "0x" + Math.random().toString(16).substr(2, 64)

      updateLastTransaction(txHash)

      pendingToast.dismiss()
      toast({
        title: "Candidate Added Successfully!",
        description: `${candidateForm.name} has been added. Transaction: ${txHash.slice(0, 10)}...`,
      })

      // Reset form
      setCandidateForm({
        name: "",
        description: "",
        topic1: 5,
        topic2: 5,
        topic3: 5,
      })
    } catch (err) {
      pendingToast.dismiss()
      const errorMessage = err instanceof Error ? err.message : "Failed to add candidate"
      setError(errorMessage)
      toast({
        title: "Failed to Add Candidate",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMerkleRoot = async () => {
    if (!isOwner) {
      toast({
        title: "Access Denied",
        description: "Only the contract owner can update the Merkle root",
        variant: "destructive",
      })
      return
    }

    if (!merkleRootInput.trim()) {
      toast({
        title: "Validation Error",
        description: "Merkle root is required",
        variant: "destructive",
      })
      return
    }

    if (!merkleRootInput.match(/^0x[a-fA-F0-9]{64}$/)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid Merkle root (64-character hex string starting with 0x)",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError("")

    const pendingToast = toast({
      title: "Updating Merkle Root...",
      description: "Transaction is being processed",
    })

    try {
      console.log("[v0] Updating Merkle root:", merkleRootInput)

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock successful response
      const txHash = "0x" + Math.random().toString(16).substr(2, 64)

      updateLastTransaction(txHash)

      pendingToast.dismiss()
      toast({
        title: "Merkle Root Updated Successfully!",
        description: `Voter eligibility updated. Transaction: ${txHash.slice(0, 10)}...`,
      })

      setMerkleRootInput("")
    } catch (err) {
      pendingToast.dismiss()
      const errorMessage = err instanceof Error ? err.message : "Failed to update Merkle root"
      setError(errorMessage)
      toast({
        title: "Failed to Update Merkle Root",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    })
  }

  if (isOwner === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-8 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Access denied. You must be the contract owner to access the admin panel.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Election Admin Panel</h1>
          <p className="text-muted-foreground">Manage elections, candidates, and voter eligibility</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Owner Access
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Contract Information */}
      {deploymentConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Contract Information
            </CardTitle>
            <CardDescription>
              Deployed contracts on {deploymentConfig.network} (Chain ID: {deploymentConfig.chainId})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Election Contract</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {deploymentConfig.contracts.election.address}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(deploymentConfig.contracts.election.address)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">BAL Token Contract</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {deploymentConfig.contracts.balToken.address}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(deploymentConfig.contracts.balToken.address)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="election" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="election" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Election Settings
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="voters" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Voters
          </TabsTrigger>
        </TabsList>

        {/* Election Settings Tab */}
        <TabsContent value="election">
          <Card>
            <CardHeader>
              <CardTitle>Create Election</CardTitle>
              <CardDescription>
                Configure election parameters including timing, rewards, and voter eligibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="election-name">Election Name *</Label>
                    <Input
                      id="election-name"
                      value={electionForm.name}
                      onChange={(e) => setElectionForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., 2025 Student Council Election"
                    />
                  </div>

                  <div>
                    <Label htmlFor="election-description">Description</Label>
                    <Textarea
                      id="election-description"
                      value={electionForm.description}
                      onChange={(e) => setElectionForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the election"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      value={electionForm.startTime}
                      onChange={(e) => setElectionForm((prev) => ({ ...prev, startTime: e.target.value }))}
                      min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)} // 1 hour from now
                    />
                    <p className="text-sm text-muted-foreground mt-1">Must be at least 1 hour in the future</p>
                  </div>

                  <div>
                    <Label htmlFor="end-time">End Time *</Label>
                    <Input
                      id="end-time"
                      type="datetime-local"
                      value={electionForm.endTime}
                      onChange={(e) => setElectionForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      min={electionForm.startTime}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="merkle-root">Voter Merkle Root</Label>
                  <Input
                    id="merkle-root"
                    value={electionForm.merkleRoot}
                    onChange={(e) => setElectionForm((prev) => ({ ...prev, merkleRoot: e.target.value }))}
                    placeholder="0x... (leave empty to set later)"
                    pattern="^0x[a-fA-F0-9]{64}$"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate using the Merkle CLI tool (see Voters tab)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="questionnaire-enabled"
                    checked={electionForm.questionnaireEnabled}
                    onChange={(e) => setElectionForm((prev) => ({ ...prev, questionnaireEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="questionnaire-enabled">Enable Anonymous Quiz Voting</Label>
                </div>
              </div>

              <Button
                onClick={handleCreateElection}
                disabled={loading || !electionForm.name.trim() || !electionForm.startTime || !electionForm.endTime}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Skeleton className="h-4 w-4 rounded mr-2" />
                    Creating Election...
                  </>
                ) : (
                  "Create Election"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Candidates Tab */}
        <TabsContent value="candidates">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Candidate
                </CardTitle>
                <CardDescription>Add candidates with their policy positions for questionnaire matching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="candidate-name">Candidate Name *</Label>
                      <Input
                        id="candidate-name"
                        value={candidateForm.name}
                        onChange={(e) => setCandidateForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Alice Johnson"
                      />
                    </div>

                    <div>
                      <Label htmlFor="candidate-description">Description</Label>
                      <Textarea
                        id="candidate-description"
                        value={candidateForm.description}
                        onChange={(e) => setCandidateForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief candidate bio or platform"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Policy Positions (0-10 scale)</Label>
                      <p className="text-sm text-muted-foreground mb-4">Used for anonymous questionnaire matching</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="topic1">Economic Policy: {candidateForm.topic1}</Label>
                        <input
                          id="topic1"
                          type="range"
                          min="0"
                          max="10"
                          value={candidateForm.topic1}
                          onChange={(e) =>
                            setCandidateForm((prev) => ({ ...prev, topic1: Number.parseInt(e.target.value) }))
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Conservative</span>
                          <span>Progressive</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="topic2">Social Issues: {candidateForm.topic2}</Label>
                        <input
                          id="topic2"
                          type="range"
                          min="0"
                          max="10"
                          value={candidateForm.topic2}
                          onChange={(e) =>
                            setCandidateForm((prev) => ({ ...prev, topic2: Number.parseInt(e.target.value) }))
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Traditional</span>
                          <span>Liberal</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="topic3">Security Policy: {candidateForm.topic3}</Label>
                        <input
                          id="topic3"
                          type="range"
                          min="0"
                          max="10"
                          value={candidateForm.topic3}
                          onChange={(e) =>
                            setCandidateForm((prev) => ({ ...prev, topic3: Number.parseInt(e.target.value) }))
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Restrictive</span>
                          <span>Open</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleAddCandidate}
                  disabled={loading || !candidateForm.name.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Skeleton className="h-4 w-4 rounded mr-2" />
                      Adding Candidate...
                    </>
                  ) : (
                    "Add Candidate"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Current Candidates */}
            {candidates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Candidates</CardTitle>
                  <CardDescription>
                    {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} registered
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {candidates.map((candidate) => (
                      <div key={candidate.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{candidate.name}</h4>
                            {candidate.description && (
                              <p className="text-sm text-muted-foreground mt-1">{candidate.description}</p>
                            )}
                            <div className="flex gap-4 mt-2 text-sm">
                              <span>Economic: {candidate.questionnaireProfile[0]}</span>
                              <span>Social: {candidate.questionnaireProfile[1]}</span>
                              <span>Security: {candidate.questionnaireProfile[2]}</span>
                            </div>
                          </div>
                          <Badge variant={candidate.isActive ? "default" : "secondary"}>
                            {candidate.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Voters Tab */}
        <TabsContent value="voters">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Merkle Tree Voter Management</CardTitle>
                <CardDescription>Generate voter eligibility proofs and update the on-chain Merkle root</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Step 1:</strong> Use the Merkle CLI tool to generate voter proofs from a CSV file
                  </AlertDescription>
                </Alert>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">CLI Commands:</h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="bg-background p-2 rounded border">
                      <code># Generate voter list from CSV</code>
                      <br />
                      <code>npm run merkle:build</code>
                    </div>
                    <div className="bg-background p-2 rounded border">
                      <code># Setup complete election with voters</code>
                      <br />
                      <code>npm run setup-election</code>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">CSV Format:</h4>
                  <div className="bg-muted p-3 rounded text-sm font-mono">
                    address,name,email
                    <br />
                    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,Alice,alice@example.com
                    <br />
                    0x70997970C51812dc3A010C7d01b50e0d17dc79C8,Bob,bob@example.com
                  </div>
                </div>

                <Separator />

                <div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step 2:</strong> Paste the generated Merkle root to update voter eligibility
                    </AlertDescription>
                  </Alert>

                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="merkle-root-input">Merkle Root</Label>
                      <Input
                        id="merkle-root-input"
                        value={merkleRootInput}
                        onChange={(e) => setMerkleRootInput(e.target.value)}
                        placeholder="0x... (64-character hex string)"
                        pattern="^0x[a-fA-F0-9]{64}$"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Copy from merkleRoot.txt generated by the CLI tool
                      </p>
                    </div>

                    <Button
                      onClick={handleUpdateMerkleRoot}
                      disabled={loading || !merkleRootInput.trim() || !merkleRootInput.match(/^0x[a-fA-F0-9]{64}$/)}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Skeleton className="h-4 w-4 rounded mr-2" />
                          Updating Merkle Root...
                        </>
                      ) : (
                        "Update Merkle Root"
                      )}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Current Merkle Root:</strong>{" "}
                    <code className="text-xs">{deploymentConfig?.configuration.merkleRoot || "Not set"}</code>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
