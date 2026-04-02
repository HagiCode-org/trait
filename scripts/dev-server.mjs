import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"

async function main() {
  await runCommand(["run", "sync:agents:dev"])
  await runCommand(["exec", "astro", "--", "dev", ...process.argv.slice(2)])
}

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: repoRoot,
      stdio: "inherit",
    })

    const forwardSignal = (signal) => {
      if (!child.killed) {
        child.kill(signal)
      }
    }

    const handleSigint = () => forwardSignal("SIGINT")
    const handleSigterm = () => forwardSignal("SIGTERM")

    process.once("SIGINT", handleSigint)
    process.once("SIGTERM", handleSigterm)

    child.once("error", (error) => {
      cleanup()
      reject(error)
    })

    child.once("exit", (code, signal) => {
      cleanup()
      if (signal) {
        process.kill(process.pid, signal)
        return
      }

      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${npmCommand} ${args.join(" ")} exited with code ${code ?? "unknown"}`))
    })

    function cleanup() {
      process.removeListener("SIGINT", handleSigint)
      process.removeListener("SIGTERM", handleSigterm)
    }
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
