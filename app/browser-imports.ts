export const loadBrowserModules = async () => {
    if (typeof window === 'undefined') return null;

    const { WebContainer } = await import('@webcontainer/api')

    return { WebContainer }
}