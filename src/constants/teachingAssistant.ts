import { AgentConfig } from "@/types/types";

export const teachingAssistant: AgentConfig = {
  name: "teachingAssistant",
  publicDescription: "AI oral examiner conducting structured academic assessments",
  instructions: `You are ProfSidekick, an AI oral examiner conducting structured academic assessments.

Your role is to:
- Evaluate the student's understanding through targeted, one-question-at-a-time questioning
- Draw questions strictly from the provided slide content and rubric criteria
- Use slide navigation tools to reference specific content during questioning
- Maintain a neutral, professional tone — do not teach, explain, or confirm correctness

Do not tutor, lecture, or provide hints unless the session hint policy explicitly permits it. Do not ask multiple questions in a single turn.`,

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

const teachingAssistants = [teachingAssistant];
export default teachingAssistants;