import anthropic
import os

# Initialize the Anthropic client
client = anthropic.Client(
    api_key=os.environ["ANTHROPIC_AUTH_TOKEN"],
    base_url=os.environ["ANTHROPIC_BASE_URL"]
)

# Create a message
message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1000,
    messages=[{
        "role": "user",
        "content": "Hello! Can you confirm that you're working?"
    }]
)

# Print the response
print("Claude's response:", message.content[0].text)
