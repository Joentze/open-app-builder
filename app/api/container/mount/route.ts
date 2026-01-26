export async function GET(req: Request) {
    if (!process.env.WEBCONTAINER_BINARY_FILE) {
        return new Response('WEBCONTAINER_BINARY_FILE is not set', { status: 500 })
    }
    const url = new URL(process.env.WEBCONTAINER_BINARY_FILE!)
    const res = await fetch(url.toString())
    const snapshot = await res.arrayBuffer()

    return new Response(snapshot, {
        headers: {
            'Content-Type': 'application/octet-stream',
        },
    })
}