import { type NextRequest, NextResponse } from "next/server"
import { WordsDatabase, FallbackWordsSystem } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(Number.parseInt(searchParams.get("days") || "30"), 60) // Límite máximo de 60 días

    console.log(`Fetching history for ${days} days`)

    // Verificar conexión a Supabase
    const isConnected = await WordsDatabase.checkConnection()

    if (!isConnected) {
      console.log("Supabase not available, using fallback system")
      const fallbackWords = FallbackWordsSystem.getRecentWords(days)
      return NextResponse.json(fallbackWords)
    }

    // Intentar obtener palabras de la base de datos
    const wordsFromDB = await WordsDatabase.getRecentWords(days)

    if (wordsFromDB.length > 0) {
      console.log(`Found ${wordsFromDB.length} words in database`)
      return NextResponse.json(wordsFromDB)
    }

    console.log("No words found in database, using fallback system")
    const fallbackWords = FallbackWordsSystem.getRecentWords(days)
    return NextResponse.json(fallbackWords)
  } catch (error) {
    console.error("History API Error:", error)

    // En caso de error, usar sistema de fallback
    const fallbackWords = FallbackWordsSystem.getRecentWords(30)
    return NextResponse.json(fallbackWords)
  }
}
