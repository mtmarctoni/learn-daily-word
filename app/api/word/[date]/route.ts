import { type NextRequest, NextResponse } from "next/server"
import { WordsDatabase, FallbackWordsSystem, type WordData } from "@/lib/supabase"

async function generateWordWithHuggingFace(date: string): Promise<Omit<WordData, "id" | "created_at" | "updated_at">> {
  console.log(`Attempting to generate word with Hugging Face for date: ${date}`)

  if (!process.env.HUGGINGFACE_API_KEY) {
    console.log("No Hugging Face API key found, using fallback word")
    const fallbackWord = FallbackWordsSystem.getWordByDate(date)
    return { ...fallbackWord, source: "ai_fallback" }
  }

  try {
    // Simplified approach - use a more reliable model endpoint
    const response = await fetch("https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `Generate a B2-C1 English word with definition, phonetic, translation to Spanish, and 3 examples.`,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    })

    if (!response.ok) {
      console.error(`Hugging Face API error: ${response.status} ${response.statusText}`)
      const fallbackWord = FallbackWordsSystem.getWordByDate(date)
      return { ...fallbackWord, source: "ai_fallback" }
    }

    const result = await response.json()
    console.log("Hugging Face response:", result)

    // If API response is not as expected, use fallback
    const fallbackWord = FallbackWordsSystem.getWordByDate(date)
    return { ...fallbackWord, source: "ai_fallback" }
  } catch (error) {
    console.error("Error with Hugging Face API:", error)
    const fallbackWord = FallbackWordsSystem.getWordByDate(date)
    return { ...fallbackWord, source: "ai_fallback" }
  }
}

export async function GET(request: NextRequest, { params }: { params: { date: string } }) {
  console.log("=== API Route Called ===")
  console.log("Date param:", params.date)

  try {
    const date = params.date

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error("Invalid date format:", date)
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 })
    }

    console.log(`Processing request for date: ${date}`)

    // Verificar conexión a Supabase
    let isConnected = false
    try {
      isConnected = await WordsDatabase.checkConnection()
      console.log("Supabase connection status:", isConnected)
    } catch (error) {
      console.error("Error checking Supabase connection:", error)
      isConnected = false
    }

    if (!isConnected) {
      console.log("Supabase not available, using fallback system")
      const fallbackWord = FallbackWordsSystem.getWordByDate(date)
      const wordWithSource = { ...fallbackWord, source: "database_unavailable" }
      console.log("Returning fallback word:", wordWithSource.word)
      return NextResponse.json(wordWithSource)
    }

    // Intentar obtener de la base de datos
    let existingWord = null
    try {
      existingWord = await WordsDatabase.getWordByDate(date)
      console.log("Existing word query result:", existingWord ? existingWord.word : "none")
    } catch (error) {
      console.error("Error fetching existing word:", error)
    }

    if (existingWord) {
      console.log(`Found existing word in database: ${existingWord.word}`)
      return NextResponse.json(existingWord)
    }

    console.log(`No existing word found, generating new word for ${date}`)

    // Si no existe, generar nueva palabra
    let newWordData
    try {
      newWordData = await generateWordWithHuggingFace(date)
      console.log("Generated word data:", newWordData.word)
    } catch (error) {
      console.error("Error generating word:", error)
      newWordData = FallbackWordsSystem.getWordByDate(date)
    }

    // Intentar guardar en la base de datos
    let savedWord = null
    try {
      console.log("Attempting to save word to database...")
      savedWord = await WordsDatabase.saveWord(newWordData)
      if (savedWord) {
        console.log(`Successfully saved new word: ${savedWord.word}`)
      } else {
        console.log("Failed to save word to database")
      }
    } catch (error) {
      console.error("Error saving word:", error)
    }

    // Retornar la palabra (guardada o generada)
    const wordToReturn = savedWord || newWordData
    console.log("Returning word:", wordToReturn.word)
    return NextResponse.json(wordToReturn)
  } catch (error) {
    console.error("=== API Route Error ===")
    console.error("Error details:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace")

    // Retornar palabra de emergencia usando el sistema de fallback
    try {
      const emergencyWord = FallbackWordsSystem.getWordByDate(params.date)
      const wordWithSource = { ...emergencyWord, source: "emergency" }
      console.log("Returning emergency word:", wordWithSource.word)
      return NextResponse.json(wordWithSource)
    } catch (fallbackError) {
      console.error("Even fallback failed:", fallbackError)

      // Última línea de defensa - palabra hardcodeada
      const hardcodedWord = {
        date: params.date,
        word: "resilient",
        phonetic: "/rɪˈzɪliənt/",
        definition: "Able to recover quickly from difficult conditions",
        translation: "resistente, resiliente",
        examples: [
          "We need to be resilient in difficult times.",
          "The app is resilient and works even offline.",
          "Your learning journey requires resilient effort.",
        ],
        level: "B2",
        source: "emergency",
      }

      return NextResponse.json(hardcodedWord)
    }
  }
}
