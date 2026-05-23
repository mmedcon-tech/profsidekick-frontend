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