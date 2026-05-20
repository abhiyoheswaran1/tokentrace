export async function waitFor(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`serve exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      // wait
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export async function stopChild(child) {
  if (child.exitCode != null || child.signalCode != null) return;

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);

  if (child.exitCode == null && child.signalCode == null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1_000))
    ]);
  }
}
