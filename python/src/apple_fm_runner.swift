import Foundation
import FoundationModels

struct RequestPayload: Codable {
    let prompt: String
    let instructions: String?
    let temperature: Double?
    let maxTokens: Int?
}

struct TokenUsage: Codable {
    let promptTokens: Int
    let completionTokens: Int
    let totalTokens: Int
}

struct ResponsePayload: Codable {
    let status: String
    let response: String?
    let usage: TokenUsage?
    let error: String?
}

@main
struct FMRunner {
    static func main() async {
        let inputData = FileHandle.standardInput.readDataToEndOfFile()
        guard let req = try? JSONDecoder().decode(RequestPayload.self, from: inputData) else {
            let err = ResponsePayload(status: "error", response: nil, usage: nil, error: "Failed to parse input JSON")
            output(err)
            return
        }

        var options = GenerationOptions()
        if let temp = req.temperature {
            options.temperature = temp
        }
        if let maxTokens = req.maxTokens {
            options.maximumResponseTokens = maxTokens
        }

        let session: LanguageModelSession
        if let inst = req.instructions, !inst.isEmpty {
            session = LanguageModelSession(instructions: inst)
        } else {
            session = LanguageModelSession()
        }

        do {
            let res = try await session.respond(to: req.prompt, options: options)
            let usage = TokenUsage(
                promptTokens: res.usage.input.totalTokenCount,
                completionTokens: res.usage.output.totalTokenCount,
                totalTokens: res.usage.totalTokenCount
            )
            let out = ResponsePayload(status: "success", response: res.content, usage: usage, error: nil)
            output(out)
        } catch {
            let err = ResponsePayload(status: "error", response: nil, usage: nil, error: "\(error)")
            output(err)
        }
    }

    static func output(_ payload: ResponsePayload) {
        if let data = try? JSONEncoder().encode(payload),
           let str = String(data: data, encoding: .utf8) {
            print(str)
        }
    }
}
