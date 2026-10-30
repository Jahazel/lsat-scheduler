import { z } from "zod";

// Zod probes for eval with `new Function("")`; the CSP blocks it, and the browser reports the probe as a violation.
z.config({ jitless: true });
