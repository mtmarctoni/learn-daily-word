import { InferenceClient } from "@huggingface/inference"

// Initialize Hugging Face client
const hf = process.env.HUGGINGFACE_API_KEY ? new InferenceClient(process.env.HUGGINGFACE_API_KEY) : null

export interface GeneratedWord {
  word: string
  phonetic: string
  definition: string
  translation: string
  examples: string[]
  level: string
}

export class HuggingFaceWordGenerator {
  private static async getRandomWord(): Promise<string | null> {
    try {
      console.log("Fetching random word from API...")
      const response = await fetch("https://random-word-api.herokuapp.com/word")

      if (!response.ok) {
        console.error("Random word API request failed:", response.status)
        return null
      }

      const data = await response.json()
      console.log("Random word API response:", data)

      if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
        const randomWord = data[0].toLowerCase()
        console.log("Got random word:", randomWord)
        return randomWord
      }

      console.error("Invalid response format from random word API")
      return null
    } catch (error) {
      console.error("Error fetching random word:", error)
      return null
    }
  }

  public static async generateWord(date: string): Promise<GeneratedWord | null> {
    if (!hf) {
      console.log("Hugging Face client not initialized - no API key")
      return null
    }

    console.log(`Attempting to generate word for date: ${date}`)

    // First, get a random word
    const randomWord = await this.getRandomWord()
    if (!randomWord) {
      console.log("Failed to get random word, falling back to Smart Word Bank")
      return null
    }

    console.log(`Using random word: ${randomWord}`)

    const aiPrompt = `You are an English vocabulary teacher. I will give you an English word, and you need to provide detailed information about it in JSON format.

Word: "${randomWord}"

Please respond with ONLY a valid JSON object in this exact format (no additional text, no markdown, no code blocks):

{
  "word": "${randomWord}",
  "phonetic": "[IPA phonetic transcription with forward slashes]",
  "definition": "[clear, concise definition in English]",
  "translation": "[Spanish translation]",
  "examples": [
    "[example sentence using the word]",
    "[another example sentence using the word]",
    "[third example sentence using the word]"
  ],
  "level": "[B2 or C1 based on word difficulty]"
}

Requirements:
- Use proper IPA phonetic notation with forward slashes
- Provide a clear, educational definition
- Give accurate Spanish translation
- Create 3 realistic example sentences
- Assign appropriate level (B2 for intermediate-advanced, C1 for advanced)
- Respond with ONLY the JSON object, no other text

Generate the information for the word "${randomWord}":`

    try {
      const chatCompletion = await hf.chatCompletion({
        provider: "groq",
        model: "meta-llama/Llama-3.3-70B-Instruct",
        messages: [
          {
            role: "user",
            content: aiPrompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent formatting
      })

      console.log("Hugging Face chat completion response:", chatCompletion)

      if (chatCompletion && chatCompletion.choices && chatCompletion.choices[0] && chatCompletion.choices[0].message) {
        const responseContent = chatCompletion.choices[0].message.content
        console.log("AI response content:", responseContent)

        if (responseContent) {
          const parsed = this.parseJSONResponse(responseContent)
          if (parsed) {
            console.log("Successfully parsed AI-generated word:", parsed.word)
            return parsed
          }
        }
      }

      console.log("Failed to parse Hugging Face response")
      return null
    } catch (error) {
      console.error("Error with Hugging Face chat completion:", error)
      return null
    }
  }

  private static parseJSONResponse(text: string): GeneratedWord | null {
    try {
      // Clean the response text - remove any markdown code blocks or extra text
      let cleanText = text.trim()

      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "")

      // Find JSON object in the text
      const jsonStart = cleanText.indexOf("{")
      const jsonEnd = cleanText.lastIndexOf("}")

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1)
      }

      console.log("Attempting to parse JSON:", cleanText)

      const parsed = JSON.parse(cleanText)

      // Validate required fields
      if (
        parsed.word &&
        parsed.definition &&
        parsed.translation &&
        parsed.examples &&
        Array.isArray(parsed.examples) &&
        parsed.examples.length >= 2
      ) {
        return {
          word: parsed.word,
          phonetic: parsed.phonetic || `/${parsed.word}/`,
          definition: parsed.definition,
          translation: parsed.translation,
          examples: parsed.examples.slice(0, 3), // Take max 3 examples
          level: parsed.level || "B2",
        }
      }

      console.log("Parsed JSON is missing required fields")
      return null
    } catch (error) {
      console.error("Error parsing JSON response:", error)
      console.log("Raw text that failed to parse:", text)
      return null
    }
  }

  public static isAvailable(): boolean {
    return hf !== null
  }
}

// Enhanced Smart Word Bank with more words
export class SmartWordBank {
  private static words: GeneratedWord[] = [
    {
      word: "articulate",
      phonetic: "/ɑːrˈtɪkjələt/",
      definition: "Having or showing the ability to speak fluently and coherently",
      translation: "articulado, elocuente",
      examples: [
        "She's very articulate when explaining complex topics.",
        "The speaker gave an articulate presentation on climate change.",
        "He struggled to articulate his feelings about the situation.",
      ],
      level: "C1",
    },
    {
      word: "comprehensive",
      phonetic: "/ˌkɑːmprɪˈhensɪv/",
      definition: "Complete and including everything that is necessary",
      translation: "completo, exhaustivo",
      examples: [
        "The report provides a comprehensive analysis of the market.",
        "She has comprehensive knowledge of European history.",
        "The insurance policy offers comprehensive coverage.",
      ],
      level: "B2",
    },
    {
      word: "substantial",
      phonetic: "/səbˈstænʃəl/",
      definition: "Of considerable importance, size, or worth",
      translation: "sustancial, considerable",
      examples: [
        "There has been substantial progress in medical research.",
        "The company made substantial investments in new technology.",
        "She received a substantial salary increase this year.",
      ],
      level: "B2",
    },
    {
      word: "inevitable",
      phonetic: "/ɪnˈevɪtəbəl/",
      definition: "Certain to happen; unavoidable",
      translation: "inevitable, ineludible",
      examples: [
        "Change is inevitable in any growing organization.",
        "It was inevitable that they would eventually meet.",
        "The economic downturn seemed inevitable after the crisis.",
      ],
      level: "C1",
    },
    {
      word: "contemporary",
      phonetic: "/kənˈtempəreri/",
      definition: "Belonging to or occurring in the present time",
      translation: "contemporáneo, actual",
      examples: [
        "Contemporary art often challenges traditional concepts.",
        "She studies contemporary literature at university.",
        "The building combines classical and contemporary styles.",
      ],
      level: "C1",
    },
    {
      word: "fundamental",
      phonetic: "/ˌfʌndəˈmentəl/",
      definition: "Forming a necessary base or core; of central importance",
      translation: "fundamental, básico",
      examples: [
        "Reading is fundamental to academic success.",
        "There are fundamental differences between the approaches.",
        "Understanding grammar is fundamental to learning languages.",
      ],
      level: "B2",
    },
    {
      word: "significant",
      phonetic: "/sɪɡˈnɪfɪkənt/",
      definition: "Sufficiently great or important to be worthy of attention",
      translation: "significativo, importante",
      examples: [
        "There was a significant improvement in her performance.",
        "The discovery has significant implications for medicine.",
        "He made significant contributions to physics.",
      ],
      level: "B2",
    },
    {
      word: "elaborate",
      phonetic: "/ɪˈlæbərət/",
      definition: "Involving many carefully arranged parts or details",
      translation: "elaborado, detallado",
      examples: [
        "She prepared an elaborate dinner for the guests.",
        "The plan was too elaborate to implement easily.",
        "Could you elaborate on your previous statement?",
      ],
      level: "C1",
    },
    {
      word: "authentic",
      phonetic: "/ɔːˈθentɪk/",
      definition: "Of undisputed origin; genuine",
      translation: "auténtico, genuino",
      examples: [
        "The restaurant serves authentic Italian cuisine.",
        "She has an authentic passion for helping others.",
        "The painting was confirmed to be authentic.",
      ],
      level: "B2",
    },
    {
      word: "prominent",
      phonetic: "/ˈprɑːmɪnənt/",
      definition: "Important; famous; standing out so as to be seen easily",
      translation: "prominente, destacado",
      examples: [
        "She's a prominent figure in the tech industry.",
        "The building has a prominent position downtown.",
        "Environmental issues played a prominent role.",
      ],
      level: "C1",
    },
    {
      word: "coherent",
      phonetic: "/koʊˈhɪrənt/",
      definition: "Logical and consistent; easy to understand",
      translation: "coherente, lógico",
      examples: [
        "She presented a coherent argument for the proposal.",
        "The book lacks a coherent structure.",
        "His explanation was clear and coherent.",
      ],
      level: "C1",
    },
    {
      word: "persistent",
      phonetic: "/pərˈsɪstənt/",
      definition: "Continuing firmly despite difficulty or opposition",
      translation: "persistente, constante",
      examples: [
        "She was persistent in her efforts to learn.",
        "The persistent rain caused flooding.",
        "His persistent questions got him answers.",
      ],
      level: "B2",
    },
    {
      word: "versatile",
      phonetic: "/ˈvɜːrsətaɪl/",
      definition: "Able to adapt to many different functions or activities",
      translation: "versátil, polivalente",
      examples: [
        "This versatile tool can be used for many tasks.",
        "She's a versatile actress who can play any role.",
        "The ingredient works in sweet and savory dishes.",
      ],
      level: "B2",
    },
    {
      word: "innovative",
      phonetic: "/ˈɪnəveɪtɪv/",
      definition: "Featuring new methods; advanced and original",
      translation: "innovador, novedoso",
      examples: [
        "The company has an innovative approach to technology.",
        "She came up with an innovative solution.",
        "This innovative design revolutionized the industry.",
      ],
      level: "B2",
    },
    {
      word: "sophisticated",
      phonetic: "/səˈfɪstɪkeɪtɪd/",
      definition: "Having great knowledge or experience; complex and refined",
      translation: "sofisticado, refinado",
      examples: [
        "The restaurant offers sophisticated cuisine.",
        "She has sophisticated understanding of politics.",
        "The software uses sophisticated algorithms.",
      ],
      level: "C1",
    },
    {
      word: "compelling",
      phonetic: "/kəmˈpelɪŋ/",
      definition: "Evoking interest, attention, or admiration powerfully",
      translation: "convincente, atractivo",
      examples: [
        "She made a compelling argument for change.",
        "The documentary presents compelling evidence.",
        "His story was compelling and moving.",
      ],
      level: "C1",
    },
    {
      word: "distinctive",
      phonetic: "/dɪˈstɪŋktɪv/",
      definition: "Characteristic of one person or thing; distinguishing",
      translation: "distintivo, característico",
      examples: [
        "The building has a distinctive architectural style.",
        "She has a distinctive way of speaking.",
        "The wine has a distinctive flavor.",
      ],
      level: "B2",
    },
    {
      word: "exceptional",
      phonetic: "/ɪkˈsepʃənəl/",
      definition: "Unusually good; outstanding",
      translation: "excepcional, extraordinario",
      examples: [
        "She showed exceptional talent in mathematics.",
        "The service at the restaurant was exceptional.",
        "These are exceptional circumstances.",
      ],
      level: "B2",
    },
    {
      word: "magnificent",
      phonetic: "/mæɡˈnɪfɪsənt/",
      definition: "Extremely beautiful, elaborate, or impressive",
      translation: "magnífico, espléndido",
      examples: [
        "The cathedral has a magnificent interior.",
        "She gave a magnificent performance.",
        "The view from the mountain was magnificent.",
      ],
      level: "B2",
    },
    {
      word: "tremendous",
      phonetic: "/trɪˈmendəs/",
      definition: "Very great in amount, scale, or intensity",
      translation: "tremendo, enorme",
      examples: [
        "The project required tremendous effort.",
        "She has tremendous respect for her mentor.",
        "There was tremendous excitement in the crowd.",
      ],
      level: "B2",
    },
    {
      word: "extraordinary",
      phonetic: "/ɪkˈstrɔːrdəneri/",
      definition: "Very unusual or remarkable",
      translation: "extraordinario, excepcional",
      examples: [
        "She has extraordinary musical talent.",
        "The rescue was an extraordinary feat.",
        "These are extraordinary times.",
      ],
      level: "C1",
    },
    {
      word: "remarkable",
      phonetic: "/rɪˈmɑːrkəbəl/",
      definition: "Worthy of attention; striking",
      translation: "notable, extraordinario",
      examples: [
        "She made remarkable progress in just one year.",
        "The recovery was remarkable.",
        "He has a remarkable memory for details.",
      ],
      level: "B2",
    },
    {
      word: "outstanding",
      phonetic: "/aʊtˈstændɪŋ/",
      definition: "Exceptionally good; clearly noticeable",
      translation: "destacado, sobresaliente",
      examples: [
        "She received an award for outstanding service.",
        "The team's performance was outstanding.",
        "There are still outstanding issues to resolve.",
      ],
      level: "B2",
    },
    {
      word: "phenomenal",
      phonetic: "/fəˈnɑːmənəl/",
      definition: "Very remarkable; extraordinary",
      translation: "fenomenal, extraordinario",
      examples: [
        "The athlete's speed is phenomenal.",
        "The company achieved phenomenal growth.",
        "She has a phenomenal ability to learn languages.",
      ],
      level: "C1",
    },
    {
      word: "spectacular",
      phonetic: "/spekˈtækjələr/",
      definition: "Beautiful in a dramatic and eye-catching way",
      translation: "espectacular, impresionante",
      examples: [
        "The sunset was absolutely spectacular.",
        "The fireworks display was spectacular.",
        "She made a spectacular comeback.",
      ],
      level: "B2",
    },
    {
      word: "incredible",
      phonetic: "/ɪnˈkredəbəl/",
      definition: "Impossible to believe; extraordinary",
      translation: "increíble, extraordinario",
      examples: [
        "The view from the top was incredible.",
        "She has incredible patience with children.",
        "The team's comeback was incredible.",
      ],
      level: "B2",
    },
    {
      word: "astonishing",
      phonetic: "/əˈstɑːnɪʃɪŋ/",
      definition: "Extremely surprising or impressive",
      translation: "asombroso, sorprendente",
      examples: [
        "The magician's tricks were astonishing.",
        "She made astonishing progress in her recovery.",
        "The results were absolutely astonishing.",
      ],
      level: "C1",
    },
    {
      word: "breathtaking",
      phonetic: "/ˈbreθteɪkɪŋ/",
      definition: "Astonishing or awe-inspiring in quality",
      translation: "impresionante, que quita el aliento",
      examples: [
        "The mountain scenery was breathtaking.",
        "She gave a breathtaking performance.",
        "The architecture is absolutely breathtaking.",
      ],
      level: "C1",
    },
  ]

  public static getWordForDate(date: string): GeneratedWord {
    // Use date hash to consistently select the same word for the same date
    const dateHash = date.split("-").reduce((acc, part) => acc + Number.parseInt(part), 0)
    const selectedWord = this.words[dateHash % this.words.length]

    console.log(`Selected smart word for ${date}: ${selectedWord.word} (${selectedWord.level})`)
    return selectedWord
  }

  public static getAllWords(): GeneratedWord[] {
    return [...this.words]
  }

  public static getWordCount(): number {
    return this.words.length
  }
}
