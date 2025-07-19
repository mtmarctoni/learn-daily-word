import { NextResponse } from "next/server"
import { WordsDatabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("=== Database Status Check ===")

    const isConnected = await WordsDatabase.checkConnection()
    console.log("Database connection:", isConnected)

    if (isConnected) {
      // Try to get a sample word to verify full functionality
      const testWord = await WordsDatabase.getWordByDate("2024-01-01")
      console.log("Sample word fetch:", testWord ? "success" : "no data")

      return NextResponse.json({
        status: "connected",
        connection: true,
        hasData: !!testWord,
        message: "Database is connected and accessible",
      })
    } else {
      return NextResponse.json({
        status: "disconnected",
        connection: false,
        hasData: false,
        message: "Database connection failed",
      })
    }
  } catch (error) {
    console.error("Database status check error:", error)
    return NextResponse.json({
      status: "error",
      connection: false,
      hasData: false,
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
