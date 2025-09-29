"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Vote, BarChart3 } from "lucide-react"
import Admin from "@/components/Admin"
import VoteComponent from "@/components/Vote"
import Results from "@/components/Results"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Elections 2025 DApp</h1>
          <p className="text-muted-foreground">
            Decentralized voting platform powered by blockchain technology and Merkle tree verification.
          </p>
        </div>

        <Tabs defaultValue="vote" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="vote" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Vote
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vote">
            <VoteComponent />
          </TabsContent>

          <TabsContent value="results">
            <Results />
          </TabsContent>

          <TabsContent value="admin">
            <Admin />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
