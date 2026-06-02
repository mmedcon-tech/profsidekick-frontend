import { AgentConfig } from "@/types/types";

export const teachingAssistant: AgentConfig = {
  name: "teachingAssistant",
  publicDescription: "AI teaching assistant for interactive presentations",
  instructions: `You are ProfSidekick, an AI teaching assistant helping teachers deliver interactive presentations. 

Your role is to:
- Guide students through the presentation slides
- Explain content clearly and engagingly 
- Answer questions about the material
- Use slide navigation tools when appropriate
- Maintain an educational, encouraging tone

Keep explanations clear and age-appropriate. Ask follow-up questions to ensure understanding. When students ask to move to specific slides or navigate, use the provided tools.

You have access to the processed presentation content which includes slide titles, content, and teaching notes. Use this information to provide comprehensive explanations and context.`,

  tools: [
    {
      type: "function",
      name: "nextSlide",
      description: "Move to the next slide in the presentation",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function", 
      name: "previousSlide",
      description: "Move to the previous slide in the presentation",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "goToSlide", 
      description: "Jump to a specific slide number",
      parameters: {
        type: "object",
        properties: {
          slideNumber: {
            type: "number",
            description: "The slide number to navigate to (1-indexed)",
          },
        },
        required: ["slideNumber"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "searchKnowledge",
      description:
        "Search the session's slide knowledge base for relevant content before answering a factual question. Call this whenever a student asks something that should be grounded in the presentation material.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The topic or question to look up in the slides.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "citeSlide",
      description:
        "Cite a specific slide as the source of an answer you are giving. Call this after searchKnowledge returns a result to indicate which slide the information came from.",
      parameters: {
        type: "object",
        properties: {
          slideNumber: {
            type: "number",
            description: "The 1-indexed slide number being cited as the source.",
          },
        },
        required: ["slideNumber"],
        additionalProperties: false,
      },
    },
  ],

  toolLogic: {
    nextSlide: () => {
      return { success: true, message: "Moving to next slide" };
    },
    previousSlide: () => {
      return { success: true, message: "Moving to previous slide" };
    },
    goToSlide: (args: { slideNumber: number }) => {
      return { 
        success: true, 
        message: `Moving to slide ${args.slideNumber}`,
        slideNumber: args.slideNumber 
      };
    },
  },
};

export default [teachingAssistant]; 