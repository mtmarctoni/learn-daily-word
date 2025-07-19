import { type NextRequest, NextResponse } from "next/server"
import { WordsDatabase, FallbackWordsSystem } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters long" }, { status: 400 })
    }

    console.log(`Searching for words with query: ${query}`)

    // Verificar conexión a Supabase
    const isConnected = await WordsDatabase.checkConnection()

    if (!isConnected) {
      console.log("Supabase not available, using fallback system")
      const fallbackResults = FallbackWordsSystem.searchWords(query.trim())
      return NextResponse.json(fallbackResults)
    }

    const words = await WordsDatabase.searchWords(query.trim())

    if (words.length > 0) {
      console.log(`Found ${words.length} words matching query in database`)
      return NextResponse.json(words)
    }

    // Si no hay resultados en la DB, buscar en fallback
    console.log("No results in database, searching fallback system")
    const fallbackResults = FallbackWordsSystem.searchWords(query.trim())
    return NextResponse.json(fallbackResults)
  } catch (error) {
    console.error("Search API Error:", error)

    // En caso de error, usar sistema de fallback
    const fallbackResults = FallbackWordsSystem.searchWords(request.nextUrl.searchParams.get("q") || "")
    return NextResponse.json(fallbackResults)
  }
}
