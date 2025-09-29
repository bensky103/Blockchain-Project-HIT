"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, BarChart3, Copy, CheckCircle, AlertCircle, Crown, Clock, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { updateLastTransaction } from "@/components/DebugPanel"

// Types based on existing patterns
interface Candidate {
  id: number
  name: string
  description: string
  voteCount: number
  isActive: boolean
  questionnaireProfile: [number, number, number]
}

interface ElectionStatus {
  status: number // 0=Not Started, 1=Scheduled, 2=Active, 3=Ended, 4=Completed
  statusText: string
  isOpen: boolean
  isFinalized: boolean
}

interface ElectionResults {
  totalVotes: number
  candidates: Candidate[]
  winner: Candidate | null
  isFinalized: boolean
}

export default function Results() {
  // State management
  const [results, setResults] = useState<ElectionResults | null>(null)
  const [electionStatus, setElectionStatus] = useState<ElectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState<string>("")
  const { toast } = useToast()

  // Load results data on component mount
  useEffect(() => {
    loadResults()
    loadElectionStatus()
  }, [])

  const loadResults = async () => {
    setLoading(true)
    try {
      // Mock API call - in real implementation would call /results endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockCandidates: Candidate[] = [
        {
          id: 1,
          name: "Alice Johnson",
          description: "Progressive candidate focused on economic reform and social justice.",
          voteCount: 142,
          isActive: true,
          questionnaireProfile: [8, 9, 4],
        },
        {
          id: 2,
          name: "Bob Smith",
          description: "Conservative candidate emphasizing security and traditional values.",
          voteCount: 98,
          isActive: true,
          questionnaireProfile: [3, 2, 9],
        },
        {
          id: 3,
          name: "Carol Davis",
          description: "Centrist candidate promoting balanced policies and bipartisan cooperation.",
          voteCount: 85,
          isActive: true,
          questionnaireProfile: [5, 5, 6],
        },
      ]

      // Sort candidates by vote count (descending)
      const sortedCandidates = mockCandidates.sort((a, b) => b.voteCount - a.voteCount)
      const totalVotes = sortedCandidates.reduce((sum, candidate) => sum + candidate.voteCount, 0)
      const winner = sortedCandidates.length > 0 ? sortedCandidates[0] : null

      const mockResults: ElectionResults = {
        totalVotes,
        candidates: sortedCandidates,
        winner,
        isFinalized: false,
      }

      setResults(mockResults)
    } catch (err) {
      console.error("Failed to load results:", err)
      setError("Failed to load election results")
    } finally {
      setLoading(false)
    }
  }

  const loadElectionStatus = async () => {
    try {
      // Mock API call - in real implementation would call /election/status endpoint
      const mockStatus: ElectionStatus = {
        status: 3, // Ended
        statusText: "Ended",
        isOpen: false,
        isFinalized: false,
      }
      setElectionStatus(mockStatus)
    } catch (err) {
      console.error("Failed to load election status:", err)
    }
  }

  const handleFinalizeElection = async () => {
    setFinalizing(true)
    setError("")

    const pendingToast = toast({
      title: "Finalizing Election...",
      description: "Processing finalization transaction",
    })

    try {
      console.log("[v0] Finalizing election...")

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock successful finalization
      const response = {
        success: true,
        transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
        blockNumber: Math.floor(Math.random() * 1000000),
      }

      if (response.success) {
        updateLastTransaction(response.transactionHash)

        // Update election status to finalized
        setElectionStatus((prev) => (prev ? { ...prev, isFinalized: true, statusText: "Finalized" } : null))
        setResults((prev) => (prev ? { ...prev, isFinalized: true } : null))

        pendingToast.dismiss()
        toast({
          title: "Election Finalized Successfully! 🎉",
          description: `The election has been finalized. Transaction: ${response.transactionHash.slice(0, 10)}...`,
        })
      } else {
        throw new Error("Finalization failed")
      }
    } catch (err: any) {
      console.error("Finalization failed:", err)

      let errorMessage = "Failed to finalize election. Please try again."

      if (err.message?.includes("ElectionNotEnded")) {
        errorMessage = "Election must be ended before it can be finalized."
      } else if (err.message?.includes("AlreadyFinalized")) {
        errorMessage = "Election has already been finalized."
      } else if (err.message?.includes("OnlyOwner")) {
        errorMessage = "Only the contract owner can finalize the election."
      }

      setError(errorMessage)

      pendingToast.dismiss()
      toast({
        title: "Finalization Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setFinalizing(false)
    }
  }

  const generateResultsSummary = (): string => {
    if (!results) return ""

    const { totalVotes, candidates, winner } = results
    const date = new Date().toLocaleDateString()

    let summary = `Elections 2025 - Results Summary (${date})\n`
    summary += `==========================================\n\n`
    summary += `Total Votes Cast: ${totalVotes.toLocaleString()}\n`
    summary += `Status: ${electionStatus?.isFinalized ? "Finalized" : "Preliminary"}\n\n`

    if (winner) {
      summary += `🏆 WINNER: ${winner.name}\n`
      summary += `Votes: ${winner.voteCount.toLocaleString()} (${((winner.voteCount / totalVotes) * 100).toFixed(1)}%)\n\n`
    }

    summary += `Full Results:\n`
    summary += `-------------\n`

    candidates.forEach((candidate, index) => {
      const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : "0.0"
      const position = index + 1
      const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : `${position}.`

      summary += `${medal} ${candidate.name}: ${candidate.voteCount.toLocaleString()} votes (${percentage}%)\n`
    })

    summary += `\nGenerated by Elections 2025 DApp`

    return summary
  }

  const copyResultsToClipboard = () => {
    const summary = generateResultsSummary()
    navigator.clipboard.writeText(summary)
    toast({
      title: "Results Copied",
      description: "Election results summary has been copied to clipboard.",
    })
  }

  const generateResultsCSV = (): string => {
    if (!results) return ""

    const { totalVotes, candidates } = results
    const date = new Date().toISOString().split("T")[0]

    // CSV Header
    let csv = "Election Results Export\n"
    csv += `Date,${date}\n`
    csv += `Total Votes,${totalVotes}\n`
    csv += `Status,${electionStatus?.isFinalized ? "Finalized" : "Preliminary"}\n`
    csv += `Number of Candidates,${candidates.length}\n\n`

    // Results table header
    csv += "Rank,Candidate Name,Vote Count,Vote Percentage,Economic Policy,Social Issues,Security Policy,Description\n"

    // Results data
    candidates.forEach((candidate, index) => {
      const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : "0.00"
      const rank = index + 1

      // Escape commas and quotes in text fields
      const escapedName = `"${candidate.name.replace(/"/g, '""')}"`
      const escapedDescription = `"${candidate.description.replace(/"/g, '""')}"`

      csv += `${rank},${escapedName},${candidate.voteCount},${percentage}%,${candidate.questionnaireProfile[0]},${candidate.questionnaireProfile[1]},${candidate.questionnaireProfile[2]},${escapedDescription}\n`
    })

    csv += `\nGenerated by Elections 2025 DApp on ${new Date().toLocaleString()}`

    return csv
  }

  const downloadResultsCSV = () => {
    const csvContent = generateResultsCSV()
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `election-results-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    toast({
      title: "CSV Downloaded",
      description: "Election results have been exported to CSV file.",
    })
  }

  const getVotePercentage = (voteCount: number, totalVotes: number): number => {
    return totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error Loading Results:</strong> {error}
          </AlertDescription>
        </Alert>
        <Button onClick={loadResults} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No election results available.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Elections 2025 - Results</h1>
        <p className="text-muted-foreground">
          Live election results and candidate standings. Results are updated in real-time.
        </p>
      </div>

      {/* Status Banner */}
      <div className="mb-6">
        {electionStatus?.isFinalized ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Election Finalized</strong> - These results are official and final.
            </AlertDescription>
          </Alert>
        ) : electionStatus?.status === 3 ? (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Preliminary Results</strong> - Election has ended but results are not yet finalized.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Live Results</strong> - Election is still active. Results may change.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Winner Announcement */}
          {results.winner && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Crown className="h-6 w-6" />
                  {electionStatus?.isFinalized ? "Election Winner" : "Current Leader"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{results.winner.name}</h3>
                    <p className="text-muted-foreground mb-4">{results.winner.description}</p>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-3xl font-bold text-primary">{results.winner.voteCount.toLocaleString()}</div>
                      <div className="text-lg text-muted-foreground">
                        votes ({getVotePercentage(results.winner.voteCount, results.totalVotes).toFixed(1)}%)
                      </div>
                    </div>

                    {/* Policy Positions */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Policy Positions:</p>
                      <div className="flex flex-wrap gap-2">
                        {results.winner.questionnaireProfile.map((score, index) => (
                          <Badge key={index} variant="outline" className={getPolicyScoreColor(score)}>
                            {getPolicyLabel(index)}: {score}/10
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Trophy className="h-12 w-12 text-primary flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Candidates Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                All Candidates
              </CardTitle>
              <CardDescription>Complete results for all candidates, sorted by vote count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {results.candidates.map((candidate, index) => {
                  const percentage = getVotePercentage(candidate.voteCount, results.totalVotes)
                  const isWinner = index === 0

                  return (
                    <div
                      key={candidate.id}
                      className={`border rounded-lg p-4 ${isWinner ? "border-primary/50 bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-muted-foreground">
                              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                            </span>
                            <div>
                              <h4 className="font-semibold text-lg">{candidate.name}</h4>
                              <p className="text-sm text-muted-foreground">{candidate.description}</p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold">{candidate.voteCount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">votes</div>
                        </div>
                      </div>

                      {/* Vote Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Vote Share</span>
                          <span className="font-medium">{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>

                      {/* Policy Positions */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Policy Positions:</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.questionnaireProfile.map((score, policyIndex) => (
                            <Badge
                              key={policyIndex}
                              variant="outline"
                              className={`text-xs ${getPolicyScoreColor(score)}`}
                            >
                              {getPolicyLabel(policyIndex)}: {score}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Election Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Election Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Votes Cast</p>
                <p className="text-3xl font-bold">{results.totalVotes.toLocaleString()}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Candidates</p>
                <p className="text-xl font-semibold">{results.candidates.length}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge
                  className={electionStatus?.isFinalized ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}
                >
                  {electionStatus?.isFinalized ? "Finalized" : "Preliminary"}
                </Badge>
              </div>

              {results.winner && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Winning Margin</p>
                  <p className="text-lg font-semibold">
                    {results.candidates.length > 1
                      ? `+${(results.winner.voteCount - results.candidates[1].voteCount).toLocaleString()} votes`
                      : "Unopposed"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Copy Results Button */}
              <Button onClick={copyResultsToClipboard} variant="outline" className="w-full bg-transparent">
                <Copy className="mr-2 h-4 w-4" />
                Copy Results Summary
              </Button>

              {/* Export Results as CSV Button */}
              <Button onClick={downloadResultsCSV} variant="outline" className="w-full bg-transparent">
                <Download className="mr-2 h-4 w-4" />
                Export Results as CSV
              </Button>

              {/* Finalize Election Button */}
              {electionStatus?.status === 3 && !electionStatus?.isFinalized && (
                <Button onClick={handleFinalizeElection} disabled={finalizing} className="w-full">
                  {finalizing ? (
                    <>
                      <Skeleton className="mr-2 h-4 w-4 rounded" />
                      Finalizing Election...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalize Election
                    </>
                  )}
                </Button>
              )}

              {electionStatus?.isFinalized && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm">
                    Election has been finalized. Results are official.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Vote Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Vote Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.candidates.map((candidate, index) => {
                  const percentage = getVotePercentage(candidate.voteCount, results.totalVotes)
                  return (
                    <div key={candidate.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                        </span>
                        <span className="text-sm truncate max-w-[120px]">{candidate.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{percentage.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">{candidate.voteCount}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
