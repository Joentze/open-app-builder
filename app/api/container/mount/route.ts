export async function POST(req: Request) {
    const { type } = await req.json() as { type: "vite" | "next" };

    const binaryUrl = {
        vite: process.env.WEBCONTAINER_VITE_BINARY_FILE!,
        next: process.env.WEBCONTAINER_NEXT_BINARY_FILE!,
    }
    if (!binaryUrl[type]) {
        return new Response('Invalid type', { status: 400 })
    }
    const url = new URL(binaryUrl[type])
    const res = await fetch(url.toString())
    console.log("res", res.status);
    const snapshot = await res.arrayBuffer()

    return new Response(snapshot, {
        headers: {
            'Content-Type': 'application/octet-stream',
        },
    })
}