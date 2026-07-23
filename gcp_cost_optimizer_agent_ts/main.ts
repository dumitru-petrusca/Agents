import { createRootAgent } from "./agent.js";
import { InMemoryRunner, isFinalResponse, stringifyContent } from "@google/adk";
import { createUserContent } from "@google/genai";
import * as readline from "readline";

async function main() {
  const agent = await createRootAgent();
  const runner = new InMemoryRunner({ agent });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("GCP Cost Optimizer Agent (ADK TypeScript)");
  console.log("Type 'exit' or 'quit' to stop.\n");

  const prompt = () => {
    rl.question("\nUser: ", async (input) => {
      const trimmed = input.trim();
      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        rl.close();
        return;
      }
      if (!trimmed) {
        prompt();
        return;
      }

      try {
        process.stdout.write("Agent: Thinking...");
        const generator = runner.runEphemeral({
          userId: "user-123",
          newMessage: createUserContent(trimmed),
        });

        let finalContent = "";
        for await (const event of generator) {
          if (isFinalResponse(event)) {
            finalContent = stringifyContent(event);
          }
        }

        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log(`Agent:\n${finalContent}`);
      } catch (err: any) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.error(`Error: ${err.message}`);
      }
      prompt();
    });
  };

  prompt();
}

main();
