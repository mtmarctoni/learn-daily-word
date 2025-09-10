import { type NextRequest, NextResponse } from "next/server";
import {
  WordsDatabase,
  FallbackWordsSystem,
  type WordData,
} from "@/lib/supabase";
import { HuggingFaceWordGenerator, SmartWordBank } from "@/lib/huggingface";

async function generateWordWithSmartBank(
  date: string
): Promise<Omit<WordData, "id" | "created_at" | "updated_at">> {
  console.log(`Generating word for date: ${date}`);

  // First, try Hugging Face AI generation
  if (HuggingFaceWordGenerator.isAvailable()) {
    console.log(
      "Hugging Face API key is available, attempting AI generation..."
    );
    try {
      const aiWord = await HuggingFaceWordGenerator.generateWord(date);

      if (aiWord && aiWord.word && aiWord.word.length > 3) {
        console.log(`Successfully generated AI word: ${aiWord.word}`);
        return {
          date,
          word: aiWord.word,
          phonetic: aiWord.phonetic,
          definition: aiWord.definition,
          translation: aiWord.translation,
          examples: aiWord.examples,
          level: aiWord.level,
          source: "ai",
        };
      } else {
        console.log(
          "AI generation returned invalid word, falling back to Smart Word Bank"
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(
          "AI generation failed with error:",
          error.message,
          "- falling back to Smart Word Bank"
        );
      } else {
        console.log(
          "AI generation failed with unknown error - falling back to Smart Word Bank"
        );
      }
    }
  } else {
    console.log("Hugging Face API key not configured, using Smart Word Bank");
  }

  // Fallback to Smart Word Bank when AI fails or is not available
  console.log("Using Smart Word Bank as fallback");
  const smartWord = SmartWordBank.getWordForDate(date);
  console.log(
    `Selected fallback word: ${smartWord.word} (Level: ${smartWord.level})`
  );

  return {
    date,
    word: smartWord.word,
    phonetic: smartWord.phonetic,
    definition: smartWord.definition,
    translation: smartWord.translation,
    examples: smartWord.examples,
    level: smartWord.level,
    source: "curated", // Smart Word Bank as fallback
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { date: string } }
) {
  console.log("=== API Route Called ===");
  const { date } = await params;
  console.log("Date param:", date);

  try {
    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error("Invalid date format:", date);
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    console.log(`Processing request for date: ${date}`);

    // Verificar conexión a Supabase
    let isConnected = false;
    try {
      isConnected = await WordsDatabase.checkConnection();
      console.log("Supabase connection status:", isConnected);
    } catch (error) {
      console.error("Error checking Supabase connection:", error);
      isConnected = false;
    }

    if (!isConnected) {
      console.log("Supabase not available, using fallback system");
      const fallbackWord = FallbackWordsSystem.getWordByDate(date);
      const wordWithSource = {
        ...fallbackWord,
        source: "database_unavailable",
      };
      console.log("Returning fallback word:", wordWithSource.word);
      return NextResponse.json(wordWithSource);
    }

    // Intentar obtener de la base de datos
    let existingWord = null;
    try {
      existingWord = await WordsDatabase.getWordByDate(date);
      console.log(
        "Existing word query result:",
        existingWord ? existingWord.word : "none"
      );
    } catch (error) {
      console.error("Error fetching existing word:", error);
    }

    if (existingWord) {
      console.log(`Found existing word in database: ${existingWord.word}`);
      return NextResponse.json(existingWord);
    }

    console.log(`No existing word found, generating new word for ${date}`);

    // Generate new word using Smart Word Bank (reliable)
    let newWordData: Omit<WordData, "id" | "created_at" | "updated_at">;
    try {
      newWordData = (await generateWordWithSmartBank(date)) as Omit<
        WordData,
        "id" | "created_at" | "updated_at"
      >;
      console.log(
        "Generated word data:",
        newWordData.word,
        "with source:",
        newWordData.source
      );
    } catch (error) {
      console.error("Error generating word with Smart Bank:", error);
      // Ultimate fallback to old system
      const fallbackWord = FallbackWordsSystem.getWordByDate(date);
      newWordData = { ...fallbackWord, source: "generation_error" };
    }

    // Intentar guardar en la base de datos
    let savedWord = null;
    try {
      console.log("Attempting to save word to database...");
      savedWord = await WordsDatabase.saveWord(newWordData);
      if (savedWord) {
        console.log(`Successfully saved new word: ${savedWord.word}`);
      } else {
        console.log(
          "Failed to save word to database (using generated word anyway)"
        );
      }
    } catch (error) {
      console.error("Error saving word:", error);
    }

    // Retornar la palabra (guardada o generada)
    const wordToReturn = savedWord || newWordData;
    console.log(
      "Returning word:",
      wordToReturn.word,
      "with source:",
      wordToReturn.source
    );
    return NextResponse.json(wordToReturn);
  } catch (error) {
    console.error("=== API Route Error ===");
    console.error("Error details:", error);

    // Retornar palabra de emergencia usando Smart Word Bank
    try {
      const emergencyWord = SmartWordBank.getWordForDate(params.date);
      const wordWithSource = {
        date: params.date,
        word: emergencyWord.word,
        phonetic: emergencyWord.phonetic,
        definition: emergencyWord.definition,
        translation: emergencyWord.translation,
        examples: emergencyWord.examples,
        level: emergencyWord.level,
        source: "emergency",
      };
      console.log(
        "Returning emergency word from Smart Bank:",
        wordWithSource.word
      );
      return NextResponse.json(wordWithSource);
    } catch (fallbackError) {
      console.error("Even Smart Word Bank failed:", fallbackError);

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
        source: "hardcoded",
      };

      return NextResponse.json(hardcodedWord);
    }
  }
}
