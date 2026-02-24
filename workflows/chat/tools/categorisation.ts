import { DurableAgent } from "@workflow/ai/agent";
import { hasToolCall, type ModelMessage, type UIMessageChunk } from "ai";
import z from "zod";

async function categorise({ messages, writable }: { messages: ModelMessage[], writable: WritableStream<UIMessageChunk> }) {
    let retCategory: "easy" | "medium" | "hard" | undefined;
    const categoriser = new DurableAgent({
        model: "minimax/minimax-m2.5",
        system: `
        You are an expert at analyzing application complexity in web development. Your task is to categorize user requests into one of three complexity levels: \`easy\`, \`medium\`, or \`hard\`.

        **Classification Criteria:**

        **easy** - Simple frontend-only applications:
        - Static or client-side only functionality
        - No backend API or server-side logic required
        - No database or persistent storage needed
        - Basic UI components and interactions
        - Examples: landing pages, calculators, simple forms, UI demos, static dashboards, portfolio sites

        **medium** - Applications with moderate complexity:
        - May require backend logic but without persistent database storage
        - Client-side apps with complex state management or business logic
        - Applications using external APIs (read-only integrations)
        - Multi-step workflows or data processing
        - Server-side rendering or API routes without database
        - Examples: real-time data visualizations, weather apps, API integrations, complex forms with validation, interactive tools, search interfaces

        **hard** - Full-stack applications with database persistence:
        - Requires both frontend and backend architecture
        - Database schema design and persistent data storage
        - CRUD operations (Create, Read, Update, Delete)
        - Authentication or authorization systems
        - Complex business logic across multiple layers
        - RESTful or GraphQL API endpoints with data persistence
        - User sessions and state management across requests
        - Examples: user management systems, e-commerce platforms, content management systems, collaborative tools, social media apps, booking systems, data-driven dashboards with user accounts

        Analyze the user's request carefully. Consider:
        - Does it need to store data between sessions? → hard
        - Does it need a backend but only for logic/API calls? → medium
        - Is it purely frontend with no server requirements? → easy

        Be concise and accurate in your categorization.
        `,
        tools: {
            categorise: {
                inputSchema: z.object({
                    category: z.enum(["easy", "medium", "hard"]),
                }),
                outputSchema: z.enum(["easy", "medium", "hard"]),
                execute: async ({ category }: { category: "easy" | "medium" | "hard" }) => {
                    retCategory = category;
                    return category
                }
            }
        }

    })
    await categoriser.stream({
        preventClose: true,
        sendStart: true,
        sendFinish: false,
        stopWhen: hasToolCall("categorise"),
        messages,
        writable,
    })

    return retCategory
}

export { categorise }