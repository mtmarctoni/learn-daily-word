import { createClient } from "@supabase/supabase-js"

// Verificar que las variables de entorno existan
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables not found. Database features will be disabled.")
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

// Types for our database
export interface WordData {
  id?: string
  date: string
  word: string
  phonetic: string
  definition: string
  translation: string
  examples: string[]
  level: string
  source?: "ai" | "fallback" | "manual" | "emergency"
  created_at?: string
  updated_at?: string
}

// Database operations with improved error handling
export class WordsDatabase {
  static async checkConnection(): Promise<boolean> {
    if (!supabase) {
      console.log("Supabase client not initialized")
      return false
    }

    try {
      const { error } = await supabase.from("daily_words").select("count", { count: "exact", head: true })
      if (error) {
        console.error("Connection check error:", error.message)
        return false
      }
      return true
    } catch (error) {
      console.error("Supabase connection check failed:", error)
      return false
    }
  }

  static async getWordByDate(date: string): Promise<WordData | null> {
    if (!supabase) {
      console.log("Supabase client not available")
      return null
    }

    try {
      const { data, error } = await supabase.from("daily_words").select("*").eq("date", date).single()

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found
          return null
        }
        if (error.code === "42P01") {
          // Table doesn't exist
          console.error("Table 'daily_words' does not exist. Please run the SQL setup script.")
          return null
        }
        console.error("Error fetching word by date:", error.message)
        return null
      }

      return data
    } catch (error) {
      console.error("Error fetching word by date:", error)
      return null
    }
  }

  static async saveWord(wordData: Omit<WordData, "id" | "created_at" | "updated_at">): Promise<WordData | null> {
    if (!supabase) {
      console.log("Supabase client not available for saving")
      return null
    }

    try {
      console.log("Attempting to save word:", wordData.word)

      const { data, error } = await supabase
        .from("daily_words")
        .upsert(wordData, {
          onConflict: "date",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) {
        console.error("Error saving word:", error.message)
        if (error.code === "42P01") {
          console.error("Table 'daily_words' does not exist. Cannot save word.")
        }
        if (error.code === "42501") {
          console.error("RLS policy violation. Check Row Level Security policies.")
        }
        return null
      }

      console.log("Word saved successfully:", data.word)
      return data
    } catch (error) {
      console.error("Error saving word:", error)
      return null
    }
  }

  static async getRecentWords(limit = 30): Promise<WordData[]> {
    if (!supabase) {
      console.log("Supabase client not available for recent words")
      return []
    }

    try {
      const { data, error } = await supabase
        .from("daily_words")
        .select("*")
        .order("date", { ascending: false })
        .limit(limit)

      if (error) {
        if (error.code === "42P01") {
          console.error("Table 'daily_words' does not exist. Cannot fetch recent words.")
          return []
        }
        console.error("Error fetching recent words:", error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error fetching recent words:", error)
      return []
    }
  }

  static async searchWords(query: string): Promise<WordData[]> {
    if (!supabase) {
      console.log("Supabase client not available for search")
      return []
    }

    try {
      const { data, error } = await supabase
        .from("daily_words")
        .select("*")
        .or(`word.ilike.%${query}%,definition.ilike.%${query}%,translation.ilike.%${query}%`)
        .order("date", { ascending: false })
        .limit(50)

      if (error) {
        if (error.code === "42P01") {
          console.error("Table 'daily_words' does not exist. Cannot search words.")
          return []
        }
        console.error("Error searching words:", error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error searching words:", error)
      return []
    }
  }
}

// Fallback system when database is not available
export class FallbackWordsSystem {
  private static fallbackWords: Omit<WordData, "id" | "created_at" | "updated_at">[] = [
    {
      date: "2024-01-01",
      word: "serendipity",
      phonetic: "/ˌserənˈdɪpɪti/",
      definition: "The occurrence of events by chance in a happy or beneficial way",
      translation: "casualidad afortunada, chiripa",
      examples: [
        "Meeting you here was pure serendipity!",
        "It was serendipity that led me to find this amazing café.",
        "Sometimes the best discoveries happen through serendipity.",
      ],
      level: "C1",
      source: "manual",
    },
    {
      date: "2024-01-02",
      word: "procrastinate",
      phonetic: "/prəˈkræstɪneɪt/",
      definition: "To delay or postpone action; to put off doing something",
      translation: "procrastinar, postergar",
      examples: [
        "I tend to procrastinate when I have difficult tasks.",
        "Don't procrastinate on your homework anymore!",
        "She always procrastinates until the last minute.",
      ],
      level: "B2",
      source: "manual",
    },
    {
      date: "2024-01-03",
      word: "eloquent",
      phonetic: "/ˈeləkwənt/",
      definition: "Fluent and persuasive in speaking or writing",
      translation: "elocuente, persuasivo",
      examples: [
        "Her eloquent speech moved the entire audience.",
        "He's quite eloquent when discussing his passions.",
        "The lawyer made an eloquent argument in court.",
      ],
      level: "C1",
      source: "manual",
    },
    {
      date: "2024-01-04",
      word: "resilient",
      phonetic: "/rɪˈzɪliənt/",
      definition: "Able to recover quickly from difficult conditions",
      translation: "resistente, resiliente",
      examples: [
        "Children are remarkably resilient creatures.",
        "The city proved resilient after the natural disaster.",
        "You need to be resilient to succeed in business.",
      ],
      level: "B2",
      source: "manual",
    },
    {
      date: "2024-01-05",
      word: "ubiquitous",
      phonetic: "/juːˈbɪkwɪtəs/",
      definition: "Present, appearing, or found everywhere",
      translation: "omnipresente, ubicuo",
      examples: [
        "Smartphones have become ubiquitous in modern society.",
        "Coffee shops are ubiquitous in this neighborhood.",
        "Social media is ubiquitous among young people.",
      ],
      level: "C1",
      source: "manual",
    },
    {
      date: "2024-01-06",
      word: "ambiguous",
      phonetic: "/æmˈbɪɡjuəs/",
      definition: "Open to more than one interpretation; not having one obvious meaning",
      translation: "ambiguo, poco claro",
      examples: [
        "His response was deliberately ambiguous.",
        "The contract terms are too ambiguous.",
        "She gave an ambiguous answer to avoid conflict.",
      ],
      level: "B2",
      source: "manual",
    },
    {
      date: "2024-01-07",
      word: "ephemeral",
      phonetic: "/ɪˈfemərəl/",
      definition: "Lasting for a very short time",
      translation: "efímero, pasajero",
      examples: [
        "The beauty of cherry blossoms is ephemeral.",
        "Fame can be quite ephemeral in today's world.",
        "Their happiness felt ephemeral but intense.",
      ],
      level: "C1",
      source: "manual",
    },
    {
      date: "2024-01-08",
      word: "meticulous",
      phonetic: "/mɪˈtɪkjələs/",
      definition: "Showing great attention to detail; very careful and precise",
      translation: "meticuloso, minucioso",
      examples: [
        "She's meticulous about keeping her workspace organized.",
        "The detective conducted a meticulous investigation.",
        "His meticulous planning ensured the project's success.",
      ],
      level: "B2",
      source: "manual",
    },
    {
      date: "2024-01-09",
      word: "pragmatic",
      phonetic: "/præɡˈmætɪk/",
      definition: "Dealing with things sensibly and realistically",
      translation: "pragmático, práctico",
      examples: [
        "We need a pragmatic approach to solve this problem.",
        "She's very pragmatic when making business decisions.",
        "His pragmatic advice helped us avoid costly mistakes.",
      ],
      level: "C1",
      source: "manual",
    },
    {
      date: "2024-01-10",
      word: "versatile",
      phonetic: "/ˈvɜːrsətaɪl/",
      definition: "Able to adapt or be adapted to many different functions or activities",
      translation: "versátil, polivalente",
      examples: [
        "This versatile tool can be used for many tasks.",
        "She's a versatile actress who can play any role.",
        "The versatile ingredient works in both sweet and savory dishes.",
      ],
      level: "B2",
      source: "manual",
    },
    {
      date: "2024-01-11",
      word: "innovative",
      phonetic: "/ˈɪnəveɪtɪv/",
      definition: "Featuring new methods; advanced and original",
      translation: "innovador, novedoso",
      examples: [
        "The company is known for its innovative approach to technology.",
        "She came up with an innovative solution to the problem.",
        "This innovative design has revolutionized the industry.",
      ],
      level: "B2",
      source: "manual",
    },
    {
      date: "2024-01-12",
      word: "sophisticated",
      phonetic: "/səˈfɪstɪkeɪtɪd/",
      definition: "Having great knowledge or experience; complex and refined",
      translation: "sofisticado, refinado",
      examples: [
        "The restaurant offers sophisticated cuisine from around the world.",
        "She has a sophisticated understanding of international politics.",
        "The software uses sophisticated algorithms to analyze data.",
      ],
      level: "C1",
      source: "manual",
    },
  ]

  static getWordByDate(date: string): WordData {
    console.log(`Getting fallback word for date: ${date}`)

    // Use hash of date to consistently select the same word for the same date
    const dateHash = date.split("-").reduce((acc, part) => acc + Number.parseInt(part), 0)
    const selectedWord = this.fallbackWords[dateHash % this.fallbackWords.length]

    return { ...selectedWord, date }
  }

  static getRecentWords(days: number): WordData[] {
    // Return the most recent fallback words
    return this.fallbackWords.slice(0, Math.min(days, this.fallbackWords.length))
  }

  static searchWords(query: string): WordData[] {
    const lowerQuery = query.toLowerCase()
    return this.fallbackWords.filter(
      (word) =>
        word.word.toLowerCase().includes(lowerQuery) ||
        word.definition.toLowerCase().includes(lowerQuery) ||
        word.translation.toLowerCase().includes(lowerQuery),
    )
  }
}
