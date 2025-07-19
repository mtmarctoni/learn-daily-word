"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  Heart,
  Volume2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Star,
  Loader2,
  Search,
  Database,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
} from "lucide-react"
import { format, addDays, subDays } from "date-fns"
import { es } from "date-fns/locale"

interface WordData {
  id?: string
  word: string
  phonetic: string
  definition: string
  translation: string
  examples: string[]
  level: string
  date: string
  source?: string
}

export default function DailyEnglishApp() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentWord, setCurrentWord] = useState<WordData | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyWords, setHistoryWords] = useState<WordData[]>([])
  const [selectedHistoryWord, setSelectedHistoryWord] = useState<WordData | null>(null)
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<WordData[]>([])
  const [searching, setSearching] = useState(false)
  const [databaseStatus, setDatabaseStatus] = useState<"connected" | "fallback" | "unknown" | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favorites")
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  useEffect(() => {
    fetchWordForDate(currentDate)
  }, [currentDate])

  const fetchWordForDate = async (date: Date) => {
    setLoading(true)
    setError(null)

    try {
      const dateString = format(date, "yyyy-MM-dd")
      console.log(`Fetching word for date: ${dateString}`)

      const response = await fetch(`/api/word/${dateString}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const wordData = await response.json()
      console.log("Received word data:", wordData)

      if (!wordData || !wordData.word) {
        throw new Error("Invalid word data received")
      }

      setCurrentWord(wordData)
      setError(null)

      // Determinar el estado de la base de datos basado en la fuente
      console.log("Word source:", wordData.source)
      let newDatabaseStatus: "connected" | "fallback" | "unknown" = "unknown"

      if (wordData.source === "database_unavailable" || wordData.source === "emergency") {
        newDatabaseStatus = "fallback"
      } else if (wordData.source === "ai" || wordData.source === "manual" || wordData.source === "ai_fallback") {
        newDatabaseStatus = "connected"
      } else {
        newDatabaseStatus = "unknown"
      }

      console.log("Setting database status to:", newDatabaseStatus)
      setDatabaseStatus(newDatabaseStatus)
    } catch (error) {
      console.error("Error fetching word:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
      setDatabaseStatus("fallback")

      // Mostrar palabra de fallback en caso de error
      setCurrentWord({
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
        date: format(date, "yyyy-MM-dd"),
        source: "emergency",
      })
    } finally {
      setLoading(false)
    }
  }

  const retryFetch = () => {
    fetchWordForDate(currentDate)
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch("/api/words/history?days=30")

      if (!response.ok) {
        throw new Error("Failed to fetch history")
      }

      const words = await response.json()
      setHistoryWords(words)
    } catch (error) {
      console.error("Error fetching history:", error)
      setHistoryWords([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const searchWords = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/words/search?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error("Failed to search words")
      }

      const results = await response.json()
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching words:", error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const toggleFavorite = (word: string) => {
    const newFavorites = favorites.includes(word) ? favorites.filter((fav) => fav !== word) : [...favorites, word]

    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(newFavorites))
  }

  const speakWord = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const navigateDate = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentDate(subDays(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, 1))
    }
  }

  const showHistoryView = () => {
    setShowHistory(true)
    setSearchQuery("")
    setSearchResults([])
    fetchHistory()
  }

  const WordCard = ({ word, showDate = false }: { word: WordData; showDate?: boolean }) => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {word.level}
            </Badge>
            {word.source && (
              <Badge variant="outline" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                {word.source}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite(word.word)}
            className={favorites.includes(word.word) ? "text-red-500" : "text-gray-400"}
          >
            <Heart className={`h-5 w-5 ${favorites.includes(word.word) ? "fill-current" : ""}`} />
          </Button>
        </div>
        {showDate && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(word.date), "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        )}
        <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center gap-3">
          {word.word}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => speakWord(word.word)}
            className="text-primary hover:text-primary/80"
          >
            <Volume2 className="h-6 w-6" />
          </Button>
        </CardTitle>
        <p className="text-lg text-muted-foreground font-mono">{word.phonetic}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Definition
          </h3>
          <p className="text-muted-foreground leading-relaxed">{word.definition}</p>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-2">Traducción</h3>
          <p className="text-lg font-medium text-blue-600">{word.translation}</p>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Examples
          </h3>
          <div className="space-y-3">
            {word.examples.map((example, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-primary min-w-[20px]">{index + 1}.</span>
                <div className="flex-1">
                  <p className="text-muted-foreground leading-relaxed">{example}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakWord(example)}
                    className="mt-1 h-6 px-2 text-xs"
                  >
                    <Volume2 className="h-3 w-3 mr-1" />
                    Listen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Efecto para actualizar el estado de la base de datos cuando cambia la palabra actual
  useEffect(() => {
    if (currentWord && currentWord.source) {
      console.log("Updating database status based on word source:", currentWord.source)

      if (currentWord.source === "database_unavailable" || currentWord.source === "emergency") {
        setDatabaseStatus("fallback")
      } else if (
        currentWord.source === "ai" ||
        currentWord.source === "manual" ||
        currentWord.source === "ai_fallback"
      ) {
        setDatabaseStatus("connected")
      } else {
        setDatabaseStatus("unknown")
      }
    }
  }, [currentWord])

  if (showHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowHistory(false)
                setSelectedHistoryWord(null)
                setSearchQuery("")
                setSearchResults([])
              }}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Today
            </Button>
            <h1 className="text-2xl font-bold">Word History & Search</h1>
            <div className="w-24" />
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search words, definitions, or translations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchWords(e.target.value)
                }}
                className="pl-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
          </div>

          {selectedHistoryWord ? (
            <div>
              <Button
                variant="ghost"
                onClick={() => setSelectedHistoryWord(null)}
                className="mb-4 flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to {searchQuery ? "Search Results" : "History"}
              </Button>
              <WordCard word={selectedHistoryWord} showDate={true} />
            </div>
          ) : (
            <div>
              {historyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading word history...</span>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="grid gap-4">
                    {(searchQuery ? searchResults : historyWords).map((word, index) => (
                      <Card
                        key={word.id || index}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedHistoryWord(word)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="text-xl font-semibold">{word.word}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  {word.level}
                                </Badge>
                                {word.source && (
                                  <Badge variant="outline" className="text-xs">
                                    {word.source}
                                  </Badge>
                                )}
                                {favorites.includes(word.word) && (
                                  <Heart className="h-4 w-4 text-red-500 fill-current" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(word.date), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                              <p className="text-muted-foreground mt-2">{word.translation}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                speakWord(word.word)
                              }}
                            >
                              <Volume2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {searchQuery && searchResults.length === 0 && !searching && (
                      <div className="text-center text-muted-foreground py-8">
                        No words found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Daily English Words</h1>
          <p className="text-muted-foreground">AI-powered vocabulary with Supabase • Level B2-C1</p>
        </header>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 flex items-center justify-between">
              <span>
                <strong>Error:</strong> {error}
              </span>
              <Button variant="outline" size="sm" onClick={retryFetch} className="ml-4 bg-transparent">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Database Status Alert */}
        {!error && databaseStatus === "connected" && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Database connected!</strong> Full functionality enabled with persistent storage and AI word
              generation.
            </AlertDescription>
          </Alert>
        )}

        {!error && databaseStatus === "fallback" && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Database not available. Using offline mode with pre-loaded words.
              <br />
              <strong>To enable full functionality:</strong> Run the SQL setup script in your Supabase dashboard.
            </AlertDescription>
          </Alert>
        )}

        {!error && databaseStatus === "unknown" && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Checking database connection...</strong> Words may be generated or loaded from cache.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigateDate("prev")} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Previous Day
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Today's Word</p>
            <p className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(currentDate, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigateDate("next")}
            className="flex items-center gap-2"
            disabled={format(currentDate, "yyyy-MM-dd") >= format(new Date(), "yyyy-MM-dd")}
          >
            Next Day
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading today's word...</span>
          </div>
        ) : currentWord ? (
          <WordCard word={currentWord} />
        ) : (
          <div className="text-center text-muted-foreground">Failed to load word. Please try again.</div>
        )}

        <div className="flex justify-center mt-8">
          <Button onClick={showHistoryView} className="flex items-center gap-2" size="lg">
            <BookOpen className="h-5 w-5" />
            View History & Search
          </Button>
        </div>
      </div>
    </div>
  )
}
