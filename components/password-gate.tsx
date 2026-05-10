"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const SESSION_KEY = "moc-auth"
const PASSWORD = "MOC2026"

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true)
    }
    setReady(true)
  }, [])

  if (!ready) return null

  if (unlocked) return <>{children}</>

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1")
      setUnlocked(true)
    } else {
      setError(true)
      setInput("")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="text-center space-y-3">
          <img
            src="/moc-logo.svg"
            alt="Ministry of Culture"
            className="h-14 w-auto mx-auto"
          />
          <h1 className="text-2xl font-bold text-foreground">MoC Daily Cultural Digest</h1>
          <p className="text-sm text-muted-foreground">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(false)
            }}
            className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-500 text-center">Incorrect password. Please try again.</p>
          )}
          <Button type="submit" className="w-full bg-[#0F2837] hover:bg-[#0F2837]/80">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
