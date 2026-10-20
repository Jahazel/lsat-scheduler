(
    <div style={{ backgroundColor: 'var(--color-paper)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: '12px', fontSynthesis: 'none', gap: '48px', height: 'fit-content', lineHeight: '16px', MozOsxFontSmoothing: 'grayscale', overflow: 'clip', overflowWrap: 'anywhere', paddingBottom: '64px', paddingInline: '72px', paddingTop: '56px', WebkitFontSmoothing: 'antialiased', width: '1440px' }}>
      <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-medium)', letterSpacing: 'var(--tracking-heading)', lineHeight: 'var(--leading-h4)' }}>
          Onboarding states · Steps 1–4
        </div>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)', maxWidth: '1000px' }}>
          Each card shows the 440 px form column in one situation. An error says what is wrong and how to fix it, in one line. Red goes only on the part with the problem, and every error has a next action. Step 3 has two upload boxes, LR and RC; each has its own states. Files: PNG, JPG, or WEBP, 5 MB or less.
        </div>
      </div>
      <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-label)', textTransform: 'uppercase' }}>
          Step 1 · Goal
        </div>
        <div style={{ boxSizing: 'border-box', columnGap: '34px', display: 'flex', flexWrap: 'wrap', rowGap: '40px' }}>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0px', flexDirection: 'column', flexGrow: '1', gap: '8px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                      Current PT score
                    </div>
                    <div style={{ alignItems: 'center', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', paddingInline: '12px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', lineHeight: '20px' }}>
                        150
                      </div>
                    </div>
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0px', flexDirection: 'column', flexGrow: '1', gap: '8px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                      Goal score
                    </div>
                    <div style={{ alignItems: 'center', borderColor: 'var(--color-danger-ink)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', paddingInline: '12px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', lineHeight: '20px' }}>
                        148
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                  Your goal must be higher than your current score, 150.
                </div>
              </div>
              <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-ink) 20%, transparent)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 500, lineHeight: '20px' }}>
                  Continue
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Goal not above current score
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Checked when focus leaves the Goal box, not on each key. The Goal box gets a Danger Ink border, and one line under the pair names the fix. Continue stays grey until the goal is higher.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0px', flexDirection: 'column', flexGrow: '1', gap: '8px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                      Current PT score
                    </div>
                    <div style={{ alignItems: 'center', borderColor: 'var(--color-danger-ink)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', paddingInline: '12px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', lineHeight: '20px' }}>
                        15
                      </div>
                    </div>
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0px', flexDirection: 'column', flexGrow: '1', gap: '8px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                      Goal score
                    </div>
                    <div style={{ alignItems: 'center', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', paddingInline: '12px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', lineHeight: '20px' }}>
                        165
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                  LSAT scores go from 120 to 180. Check your current score.
                </div>
              </div>
              <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-ink) 20%, transparent)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 500, lineHeight: '20px' }}>
                  Continue
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Score outside 120–180
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Same pattern on whichever box is wrong, here a missed digit. The message gives the real range, so the student can fix it without a guess. Only this check shows while the range is wrong; the goal check waits.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-label)', textTransform: 'uppercase' }}>
          Step 3 · Analytics
        </div>
        <div style={{ boxSizing: 'border-box', columnGap: '34px', display: 'flex', flexWrap: 'wrap', rowGap: '40px' }}>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 6%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-md)', borderStyle: 'dashed', borderWidth: '1.5px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: 'var(--spacing-4)', height: '104px', paddingInline: 'var(--spacing-6)', width: '440px' }}>
                <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-accent)', borderRadius: '999px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', width: '44px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                    <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexDirection: 'column', flexGrow: '1', gap: '2px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-accent)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--leading-body)' }}>
                    Drop to add it
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Logical Reasoning screenshot
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                File dragged over the zone
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Only the box under the file changes. Its dashed line and fill turn Accent, and the line reads "Drop to add it". The type is checked on drop, not here, because some browsers hide the file type during a drag.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ alignItems: 'center', backgroundColor: 'var(--color-vellum)', borderColor: 'var(--color-danger-ink)', borderRadius: 'var(--radius-md)', borderStyle: 'dashed', borderWidth: '1.5px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: 'var(--spacing-4)', height: '104px', paddingInline: 'var(--spacing-6)', width: '440px' }}>
                <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: '999px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', width: '44px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                    <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexDirection: 'column', flexGrow: '1', gap: '2px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--leading-body)' }}>
                    Logical Reasoning screenshot
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', gap: '5px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Drop it here or
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-accent)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px' }}>
                      choose a file
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)', width: '440px' }}>
                study-notes.pdf is a PDF. Choose a PNG, JPG, or WEBP screenshot.
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Wrong file type
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Checked on drop or choose, before any upload. Only that box turns Danger Ink, and the message under it names the file and the fix. The other box is not affected. The box stays live, so the next drop clears the error.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ alignItems: 'center', backgroundColor: 'var(--color-vellum)', borderColor: 'var(--color-danger-ink)', borderRadius: 'var(--radius-md)', borderStyle: 'dashed', borderWidth: '1.5px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: 'var(--spacing-4)', height: '104px', paddingInline: 'var(--spacing-6)', width: '440px' }}>
                <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: '999px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', width: '44px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                    <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexDirection: 'column', flexGrow: '1', gap: '2px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--leading-body)' }}>
                    Reading Comprehension screenshot
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', gap: '5px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Drop it here or
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-accent)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px' }}>
                      choose a file
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)', width: '440px' }}>
                That file is 12.4 MB. Choose one that is 5 MB or less.
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                File too big
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Same pattern as the wrong type, shown here on the Reading Comprehension box. The message gives the real size and the limit. 5 MB is the Claude image limit, so a bigger file would only fail later. A crop to the question types or passage types is the usual fix.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)', width: '440px' }}>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: 'var(--spacing-4)' }}>
                  <div style={{ backgroundColor: 'var(--color-vellum)', borderColor: 'var(--color-vellum-line)', borderRadius: '4px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '4px', height: '48px', justifyContent: 'center', padding: '8px', width: '64px' }}>
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 30%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '36px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '44px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '28px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '40px' }} />
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexGrow: '1', gap: '2px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)' }}>
                      Logical Reasoning
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      lr-analytics.png · Connection lost. Your file is still here.
                    </div>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px', width: 'max-content' }}>
                    Replace
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: '2px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '4px', overflow: 'clip' }}>
                  <div style={{ backgroundColor: 'var(--color-fog)', borderRadius: '2px', boxSizing: 'border-box', height: '4px', width: 'round(62%, 1px)' }} />
                </div>
                <div style={{ alignItems: 'center', alignSelf: 'start', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', justifyContent: 'center', paddingInline: '18px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                    Try again
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Connection lost while reading
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The request never reached the server, so the screenshot is not at fault. The bar stops in Fog, the status line says what happened, and Try again sends the same file. Replace stays in its place. No red: nothing is wrong with the file.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)', width: '440px' }}>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: 'var(--spacing-4)' }}>
                  <div style={{ backgroundColor: 'var(--color-vellum)', borderColor: 'var(--color-vellum-line)', borderRadius: '4px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '4px', height: '48px', justifyContent: 'center', padding: '8px', width: '64px' }}>
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 30%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '36px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '44px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '28px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '40px' }} />
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexGrow: '1', gap: '2px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)' }}>
                      Reading Comprehension
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      rc-analytics.png · We couldn't read the rows in it.
                    </div>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px', width: 'max-content' }}>
                    Replace
                  </div>
                </div>
                <div style={{ alignItems: 'center', alignSelf: 'start', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', justifyContent: 'center', paddingInline: '18px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                    Choose a sharper screenshot
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Screenshot cannot be read
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The server got the file but could not read it: blurry, cut off, or a photo of a screen. The status line turns Danger Ink. The button replaces the file, because the same file will fail again. Each screenshot is read on its own, so the other card keeps its result.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)', width: '440px' }}>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: 'var(--spacing-4)' }}>
                  <div style={{ backgroundColor: 'var(--color-vellum)', borderColor: 'var(--color-vellum-line)', borderRadius: '4px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '4px', height: '48px', justifyContent: 'center', padding: '8px', width: '64px' }}>
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 30%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '36px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '44px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '28px' }} />
                    <div style={{ backgroundColor: 'color-mix(var(--color-ink) 18%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '3px', width: '40px' }} />
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexGrow: '1', gap: '2px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)' }}>
                      Logical Reasoning
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      progress-chart.png · No question types in this one.
                    </div>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px', width: 'max-content' }}>
                    Replace
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ alignItems: 'baseline', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--leading-small)' }}>
                      Capture this part of 7Sage Analytics
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                      Example
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)' }}>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: 'var(--spacing-3)', opacity: '0.55' }}>
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 35%, transparent)', borderRadius: '4px', boxSizing: 'border-box', flexShrink: '0', height: '8px', width: '44px' }} />
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '4px', boxSizing: 'border-box', flexShrink: '0', height: '8px', width: '64px' }} />
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '4px', boxSizing: 'border-box', flexShrink: '0', height: '8px', width: '52px' }} />
                    </div>
                    <div style={{ alignItems: 'end', backgroundColor: 'var(--color-paper)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '6px', height: '44px', opacity: '0.55', padding: '8px' }}>
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '20px', width: '14px' }} />
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '18px', width: '14px' }} />
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '26px', width: '14px' }} />
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '24px', width: '14px' }} />
                      <div style={{ backgroundColor: 'color-mix(var(--color-ink) 15%, transparent)', borderRadius: '2px', boxSizing: 'border-box', flexShrink: '0', height: '28px', width: '14px' }} />
                    </div>
                    <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '2px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--leading-caption)' }}>
                          Logical Reasoning question types
                        </div>
                        <div style={{ backgroundColor: 'var(--color-accent)', borderRadius: '999px', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', paddingBlock: '2px', paddingInline: '8px' }}>
                          <div style={{ boxSizing: 'border-box', color: 'var(--color-paper)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-caption)' }}>
                            This part
                          </div>
                        </div>
                      </div>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px' }}>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)', width: '148px' }}>
                          Diagram
                        </div>
                        <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: '3px', boxSizing: 'border-box', display: 'flex', flexGrow: '1', height: '6px' }}>
                          <div style={{ backgroundColor: 'color-mix(var(--color-ink) 30%, transparent)', borderRadius: '3px', boxSizing: 'border-box', height: '6px', width: 'round(64%, 1px)' }} />
                        </div>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexShrink: '0', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', justifyContent: 'end', lineHeight: 'var(--leading-caption)', textAlign: 'right', width: '32px' }}>
                          64%
                        </div>
                      </div>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px' }}>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)', width: '148px' }}>
                          Conditional reasoning
                        </div>
                        <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: '3px', boxSizing: 'border-box', display: 'flex', flexGrow: '1', height: '6px' }}>
                          <div style={{ backgroundColor: 'color-mix(var(--color-ink) 30%, transparent)', borderRadius: '3px', boxSizing: 'border-box', height: '6px', width: 'round(68%, 1px)' }} />
                        </div>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexShrink: '0', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', justifyContent: 'end', lineHeight: 'var(--leading-caption)', textAlign: 'right', width: '32px' }}>
                          68%
                        </div>
                      </div>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px' }}>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)', width: '148px' }}>
                          Necessary assumption
                        </div>
                        <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: '3px', boxSizing: 'border-box', display: 'flex', flexGrow: '1', height: '6px' }}>
                          <div style={{ backgroundColor: 'color-mix(var(--color-ink) 30%, transparent)', borderRadius: '3px', boxSizing: 'border-box', height: '6px', width: 'round(71%, 1px)' }} />
                        </div>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexShrink: '0', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', justifyContent: 'end', lineHeight: 'var(--leading-caption)', textAlign: 'right', width: '32px' }}>
                          71%
                        </div>
                      </div>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px' }}>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)', width: '148px' }}>
                          Phenomenon-hypothesis
                        </div>
                        <div style={{ boxSizing: 'border-box', flexGrow: '1' }} />
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.06em', lineHeight: 'var(--leading-caption)' }}>
                          HIGHEST
                        </div>
                      </div>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px' }}>
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)', width: '148px' }}>
                          Causal reasoning
                        </div>
                        <div style={{ boxSizing: 'border-box', flexGrow: '1' }} />
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.06em', lineHeight: 'var(--leading-caption)', width: 'max-content' }}>
                          MEDIUM
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', alignSelf: 'start', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', justifyContent: 'center', paddingInline: '18px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                    Choose another screenshot
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Wrong screenshot: no 7Sage rows found
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The file was read, but it has no rows for its box: no LR question types in the Logical Reasoning box, or none of the 5 passage types in the Reading Comprehension box. Usually it is the wrong 7Sage page, or the two screenshots are swapped. The 3c example opens inside the card and shows the right part. The student never reaches Review with zero rows.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-label)', textTransform: 'uppercase' }}>
          Step 4 · Review
        </div>
        <div style={{ boxSizing: 'border-box', columnGap: '34px', display: 'flex', flexWrap: 'wrap', rowGap: '40px' }}>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: '440px' }}>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'space-between', paddingInline: '12px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                    Accuracy · 5 types
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '6px' }}>
                      <div style={{ borderColor: 'var(--color-accent)', borderRadius: '3px', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '10px', width: '14px' }} />
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                        Read from screenshot
                      </div>
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '6px' }}>
                      <div style={{ borderColor: 'var(--color-ink)', borderRadius: '3px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '10px', width: '14px' }} />
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                        Edited by you
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Diagram
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      64
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Conditional reasoning
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      68
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Necessary assumption
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', justifyContent: 'end', lineHeight: 'var(--leading-caption)', textAlign: 'right', width: '72px' }}>
                      was 71%
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-danger-ink)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      104
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBottom: '10px', paddingInline: '12px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Enter a percentage from 0 to 100.
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Flaw or descriptive weakening
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      74
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Resolve, reconcile, or explain
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      75
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Value over 100
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Checked when focus leaves the box. The box border turns Danger Ink and the message sits right under its row, so the student sees which value is wrong. "was 71%" stays, so the old value is one glance away.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: '440px' }}>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'space-between', paddingInline: '12px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                    Accuracy · 5 types
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '6px' }}>
                      <div style={{ borderColor: 'var(--color-accent)', borderRadius: '3px', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '10px', width: '14px' }} />
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                        Read from screenshot
                      </div>
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '6px' }}>
                      <div style={{ borderColor: 'var(--color-ink)', borderRadius: '3px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '10px', width: '14px' }} />
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                        Edited by you
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Diagram
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      64
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Conditional reasoning
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      68
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Necessary assumption
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', justifyContent: 'end', lineHeight: 'var(--leading-caption)', textAlign: 'right', width: '72px' }}>
                      was 71%
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-danger-ink)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBottom: '10px', paddingInline: '12px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-danger-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Enter the percentage, or remove this row with ×.
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Flaw or descriptive weakening
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      74
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Resolve, reconcile, or explain
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      75
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Empty box
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The student cleared the box and left it. Same Danger Ink border and row message. The message gives both ways out, because an empty row may mean the type should not be there at all.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'space-between', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                      Accuracy · 5 types
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '6px' }}>
                        <div style={{ borderColor: 'var(--color-accent)', borderRadius: '3px', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '10px', width: '14px' }} />
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                          Read from screenshot
                        </div>
                      </div>
                      <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '6px' }}>
                        <div style={{ borderColor: 'var(--color-ink)', borderRadius: '3px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '10px', width: '14px' }} />
                        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                          Edited by you
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Diagram
                    </div>
                    <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                    <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        64
                      </div>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        %
                      </div>
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Conditional reasoning
                    </div>
                    <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                    <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        68
                      </div>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        %
                      </div>
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Necessary assumption
                    </div>
                    <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                    <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        71
                      </div>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        %
                      </div>
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Flaw or descriptive weakening
                    </div>
                    <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                    <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        74
                      </div>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        %
                      </div>
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Resolve, reconcile, or explain
                    </div>
                    <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                    <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        75
                      </div>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                        %
                      </div>
                    </div>
                    <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="#000000" stroke="var(--color-fog)" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                      Priority flags · ticked flags go first in your plan
                    </div>
                  </div>
                  <div style={{ borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', padding: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      We didn't find priority flags in your LR screenshot. If 7Sage shows any, add them with the link below.
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px', paddingInline: '12px' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                    <path d="M7 2v10M2 7h10" fill="#000000" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px' }}>
                    Add a type the screenshot missed
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                One list empty after a read
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The read found accuracy rows but no priority flags. The empty list keeps its header and says so in one line, with the way to fix it. It is not an error, so no red. The reverse case uses the same pattern: "We didn't find accuracy values in your LR screenshot. If 7Sage shows any, add them with the link below." If both LR lists are empty, the student sees Wrong screenshot on Step 3 instead.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', width: '440px' }}>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '2px', boxSizing: 'border-box', display: 'flex', flexGrow: '1', gap: '8px', height: '36px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Su
                    </div>
                    <div style={{ backgroundColor: 'var(--color-ink)', boxSizing: 'border-box', flexShrink: '0', height: '16px', width: '1px' }} />
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', height: '36px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px' }}>
                      Cancel
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', paddingBlock: '6px' }}>
                  <div style={{ boxSizing: 'border-box', display: 'flex', paddingBlock: '6px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                      Accuracy · you type the percentage
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-vellum)', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '36px', justifyContent: 'space-between', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Sufficient assumption
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                      Enter
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '36px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Most strongly supported
                    </div>
                  </div>
                  <div style={{ borderTopColor: 'var(--color-vellum-line)', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBottom: '6px', paddingInline: '12px', paddingTop: '10px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                      Priority flags · added unticked
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '36px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      No priority flags match "Su"
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Add a missed type: picker open
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                "Add a type the screenshot missed" turns into a search box with focus in it. The list shows only types not already on the page, in two groups. An accuracy type joins the Accuracy list as an "Edited by you" row with an empty box, so Confirm stays locked until it has a value. A priority flag joins the list unticked, like a Medium or Low flag. Arrow keys move the highlight; Enter adds; Escape or Cancel closes the box and returns focus to the link.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '10px', paddingBlock: '14px', paddingInline: '16px', width: '440px' }}>
                <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '16px', justifyContent: 'center', marginTop: '1px', width: '16px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2 5.2l2 2L8 3" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    I reviewed these values and they match my screenshots.
                  </div>
                </div>
                <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '16px', justifyContent: 'center', marginTop: '1px', width: '16px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2 5.2l2 2L8 3" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    These screenshots show my latest 7Sage analytics.
                  </div>
                </div>
              </div>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', gap: 'var(--spacing-3)' }}>
                  <div style={{ alignItems: 'center', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '44px', justifyContent: 'center', width: '112px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-medium)', lineHeight: '20px' }}>
                      Back
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-ink) 20%, transparent)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexGrow: '1', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '44px', justifyContent: 'center' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-medium)', lineHeight: '20px' }}>
                      Confirm snapshot
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', justifyContent: 'center', lineHeight: 'var(--leading-small)', textAlign: 'center' }}>
                  Fix Necessary assumption above to confirm.
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Confirm locked by a value
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Both statements are ticked, but one value is still wrong. Confirm stays grey, and the line under it names the row. Confirm uses aria-disabled, not disabled, so a press still works: it moves focus to that box. With two or more, the line reads "Fix 2 values above to confirm."
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '10px', paddingBlock: '14px', paddingInline: '16px', width: '440px' }}>
                <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '16px', justifyContent: 'center', marginTop: '1px', width: '16px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2 5.2l2 2L8 3" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    I reviewed these values and they match my screenshots.
                  </div>
                </div>
                <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '16px', justifyContent: 'center', marginTop: '1px', width: '16px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2 5.2l2 2L8 3" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    These screenshots show my latest 7Sage analytics.
                  </div>
                </div>
              </div>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', gap: 'var(--spacing-3)' }}>
                  <div style={{ alignItems: 'center', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '44px', justifyContent: 'center', width: '112px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-fog)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-medium)', lineHeight: '20px' }}>
                      Back
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexGrow: '1', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '44px', justifyContent: 'center', opacity: '0.72' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-paper)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-medium)', lineHeight: '20px' }}>
                      Saving…
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', justifyContent: 'center', lineHeight: 'var(--leading-small)', textAlign: 'center' }}>
                  Saving your plan. This takes a few seconds.
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Saving
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                After Confirm snapshot, both buttons stop taking presses and the label reads "Saving…". Skip for now on Step 3 also saves your plan, so it shows the same state: its link reads "Saving…" and Back stops taking presses. When the save finishes, This week opens.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '10px', paddingBlock: '14px', paddingInline: '16px', width: '440px' }}>
                <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '16px', justifyContent: 'center', marginTop: '1px', width: '16px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2 5.2l2 2L8 3" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    I reviewed these values and they match my screenshots.
                  </div>
                </div>
                <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '16px', justifyContent: 'center', marginTop: '1px', width: '16px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2 5.2l2 2L8 3" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    These screenshots show my latest 7Sage analytics.
                  </div>
                </div>
              </div>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', gap: 'var(--spacing-3)' }}>
                  <div style={{ alignItems: 'center', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '44px', justifyContent: 'center', width: '112px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-medium)', lineHeight: '20px' }}>
                      Back
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexGrow: '1', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '44px', justifyContent: 'center' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-paper)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-medium)', lineHeight: '20px' }}>
                      Confirm snapshot
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', display: 'flex', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', justifyContent: 'center', lineHeight: 'var(--leading-small)', textAlign: 'center' }}>
                  We couldn't save your plan. Check your connection and press Confirm snapshot again.
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Save failed
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The save did not finish. The values and both ticks stay, so the student only presses again. A second press is safe: if the first save did reach the server, it opens This week. Skip for now uses the same line, ending "press Skip for now again." No red, as with Connection lost: nothing in the form is wrong.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: '440px' }}>
                <div style={{ boxSizing: 'border-box', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-semibold)', paddingBottom: '8px', paddingInline: '12px', paddingTop: '20px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--leading-small)' }}>
                    Reading Comprehension
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'space-between', paddingInline: '12px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)' }}>
                    Passage types · lowest goes first in your plan
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Law
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-accent)', display: 'flex', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption)', fontWeight: 'var(--font-weight-medium)', justifyContent: 'end', lineHeight: 'var(--leading-caption)', textAlign: 'right', width: '72px' }}>
                      Goes first
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      58
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }} />
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Comparative
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      70
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }} />
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Science
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      64
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }} />
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Humanities
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }} />
                  <div style={{ alignItems: 'center', backgroundColor: 'color-mix(var(--color-accent) 4%, transparent)', borderColor: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', borderStyle: 'dashed', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      81
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }} />
                </div>
                <div style={{ alignItems: 'center', borderBottomColor: 'var(--color-vellum-line)', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '12px', height: '38px', paddingLeft: '12px', paddingRight: '4px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexGrow: '1', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Art
                  </div>
                  <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '72px' }}>
                    <div style={{ boxSizing: 'border-box', display: 'flex', fontFamily: 'var(--font-mono)', justifyContent: 'end', width: '72px' }}>
                      <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', lineHeight: 'var(--leading-caption)', width: 'max-content' }}>
                        not found
                      </div>
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-ink)', borderRadius: 'var(--radius-sm)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '2px', height: '30px', justifyContent: 'end', paddingInline: '8px', width: '64px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'transparent', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      77
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono)', lineHeight: 'var(--leading-mono)' }}>
                      %
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '28px', justifyContent: 'center', width: '28px' }} />
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Passage type not found
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The RC read missed one of the 5 passage types. Its row stays with an empty box, and Confirm stays locked until the student types the value from the screenshot. Passage-type rows have no remove button: the student always confirms all 5.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-label)', textTransform: 'uppercase' }}>
          Controls · not on the Design System page yet
        </div>
        <div style={{ boxSizing: 'border-box', columnGap: '34px', display: 'flex', flexWrap: 'wrap', rowGap: '40px' }}>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-caption)', textTransform: 'uppercase', width: '64px' }}>
                  Rest
                </div>
                <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '4px', padding: '4px', width: '440px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderRadius: '4px', boxShadow: '#00000014 0px 1px 2px', boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexGrow: '1', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '36px', justifyContent: 'center' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: '18px' }}>
                      Standard
                    </div>
                  </div>
                  <div style={{ alignContent: 'center', boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexBasis: '0%', flexGrow: '1', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', height: '36px', justifyContent: 'center', lineHeight: '18px', textAlign: 'center' }}>
                    1.5× time
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-caption)', textTransform: 'uppercase', width: '64px' }}>
                  Hover
                </div>
                <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '4px', padding: '4px', width: '440px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderRadius: '4px', boxShadow: '#00000014 0px 1px 2px', boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexGrow: '1', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '36px', justifyContent: 'center' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: '18px' }}>
                      Standard
                    </div>
                  </div>
                  <div style={{ alignContent: 'center', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', boxSizing: 'border-box', color: 'var(--color-ink)', display: 'flex', flexBasis: '0%', flexGrow: '1', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', height: '36px', justifyContent: 'center', lineHeight: '18px', textAlign: 'center' }}>
                    1.5× time
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-caption)', textTransform: 'uppercase', width: '64px' }}>
                  Focus
                </div>
                <div style={{ backgroundColor: 'var(--color-vellum)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: '4px', padding: '4px', width: '440px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderRadius: '4px', boxShadow: '#00000014 0px 1px 2px', boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexGrow: '1', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', height: '36px', justifyContent: 'center', outline: '2px solid var(--color-accent)', outlineOffset: '2px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', display: 'flex', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: '18px' }}>
                      Standard
                    </div>
                  </div>
                  <div style={{ alignContent: 'center', boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'flex', flexBasis: '0%', flexGrow: '1', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', height: '36px', justifyContent: 'center', lineHeight: '18px', textAlign: 'center' }}>
                    1.5× time
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Segmented switch · Test time (2 of its 3 options shown)
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Hover: the other option's text turns Ink on a faint Ink tint. Focus: 2px Accent ring on the chosen option, as on buttons. It is one radio group: Tab enters it, the arrow keys change the choice.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-caption)', textTransform: 'uppercase', width: '64px' }}>
                  Rest
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-smoke)', borderRadius: '4px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '16px', width: '16px' }} />
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Link assumption
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-caption)', textTransform: 'uppercase', width: '64px' }}>
                  Hover
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ backgroundColor: 'var(--color-vellum)', borderColor: 'var(--color-ink)', borderRadius: '4px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '16px', width: '16px' }} />
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Link assumption
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-caption)', textTransform: 'uppercase', width: '64px' }}>
                  Focus
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-ink)', borderRadius: '4px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', flexShrink: '0', height: '16px', outline: '2px solid var(--color-accent)', outlineOffset: '2px', width: '16px' }} />
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Link assumption
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-label)', lineHeight: 'var(--leading-caption)', textTransform: 'uppercase', width: '64px' }}>
                  On
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '16px', justifyContent: 'center', width: '16px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                      <path d="M2 5.2l2 2L8 3" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                    Link assumption
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Checkbox · priority flags, the 2 statements
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                The whole row is the hit area, label included. Hover: the border turns Ink on a Vellum fill. Focus: 2px Accent ring with a 2px gap. On: Ink fill and a white check. No disabled state: onboarding never locks a checkbox.
              </div>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '12px', width: '631px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', paddingBlock: '32px', paddingInline: '40px' }}>
              <div style={{ alignItems: 'center', backgroundColor: 'var(--color-vellum)', borderColor: 'color-mix(var(--color-ink) 28%, transparent)', borderRadius: 'var(--radius-md)', borderStyle: 'dashed', borderWidth: '1.5px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', gap: 'var(--spacing-4)', height: '104px', outline: '2px solid var(--color-accent)', outlineOffset: '2px', paddingInline: 'var(--spacing-6)', width: '440px' }}>
                <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: '999px', borderStyle: 'solid', borderWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', width: '44px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: '0' }}>
                    <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexDirection: 'column', flexGrow: '1', gap: '2px' }}>
                  <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--leading-body)' }}>
                    Logical Reasoning screenshot
                  </div>
                  <div style={{ boxSizing: 'border-box', display: 'flex', gap: '5px' }}>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                      Drop it here or
                    </div>
                    <div style={{ boxSizing: 'border-box', color: 'var(--color-accent)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-small)', textDecoration: 'underline 1px', textUnderlineOffset: '3px' }}>
                      choose a file
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 'var(--leading-small)' }}>
                Drop zone · keyboard focus
              </div>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', lineHeight: 'var(--leading-small)' }}>
                Each box is one button, so it is one Tab stop: LR first, then RC. Focus: 2px Accent ring with a 2px gap, as on buttons. Enter or Space opens the file picker for that box. Hover: the dashed line turns Ink at full strength.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
