"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Copy, ChevronDown, ChevronRight, Bug, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DebugInfo {
  lastTxHash: string
  currentRouteHash: string
  networkInfo: {
    chainId: number
    network: string
  }
  contractAddresses: {
    election: string
    balToken: string
  }
  timestamp: string
}

export default function DebugPanel() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    lastTxHash: "",
    currentRouteHash: "",
    networkInfo: {
      chainId: 31337,
      network: "localhost",
    },
    contractAddresses: {
      election: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      balToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    },
    timestamp: new Date().toISOString(),
  })

  // Update route hash when location changes
  useEffect(() => {
    const updateRouteHash = () => {
      const routeHash = window.location.pathname + window.location.search + window.location.hash
      setDebugInfo((prev) => ({
        ...prev,
        currentRouteHash: routeHash,
        timestamp: new Date().toISOString(),
      }))
    }

    updateRouteHash()
    window.addEventListener("popstate", updateRouteHash)

    return () => window.removeEventListener("popstate", updateRouteHash)
  }, [])

  // Listen for transaction updates from other components
  useEffect(() => {
    const handleTxUpdate = (event: CustomEvent) => {
      setDebugInfo((prev) => ({
        ...prev,
        lastTxHash: event.detail.txHash,
        timestamp: new Date().toISOString(),
      }))
    }

    window.addEventListener("txUpdate", handleTxUpdate as EventListener)
    return () => window.removeEventListener("txUpdate", handleTxUpdate as EventListener)
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const formatAddress = (address: string): string => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const openEtherscan = (hash: string) => {
    if (hash) {
      window.open(`https://etherscan.io/tx/${hash}`, "_blank")
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/95 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug Panel
            {isOpen ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <Card className="w-80 bg-background/95 backdrop-blur-sm border-2 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Last Transaction */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground">Last Transaction:</span>
                  {debugInfo.lastTxHash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => openEtherscan(debugInfo.lastTxHash)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {debugInfo.lastTxHash ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono">
                      {formatAddress(debugInfo.lastTxHash)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(debugInfo.lastTxHash, "Transaction hash")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    No transactions yet
                  </Badge>
                )}
              </div>

              {/* Current Route */}
              <div>
                <span className="font-medium text-muted-foreground">Current Route:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono">
                    {debugInfo.currentRouteHash || "/"}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(debugInfo.currentRouteHash, "Route")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Network Info */}
              <div>
                <span className="font-medium text-muted-foreground">Network:</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {debugInfo.networkInfo.network}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Chain ID: {debugInfo.networkInfo.chainId}
                  </Badge>
                </div>
              </div>

              {/* Contract Addresses */}
              <div>
                <span className="font-medium text-muted-foreground">Contracts:</span>
                <div className="space-y-2 mt-1">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Election:</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono">
                        {formatAddress(debugInfo.contractAddresses.election)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(debugInfo.contractAddresses.election, "Election contract")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">BAL Token:</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono">
                        {formatAddress(debugInfo.contractAddresses.balToken)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(debugInfo.contractAddresses.balToken, "BAL token contract")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Utility function to dispatch transaction updates
export const updateLastTransaction = (txHash: string) => {
  window.dispatchEvent(new CustomEvent("txUpdate", { detail: { txHash } }))
}
