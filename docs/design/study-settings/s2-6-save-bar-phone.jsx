(
    <div style={{ backgroundColor: '#F6F6F6', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: '12px', fontSynthesis: 'none', height: 'fit-content', lineHeight: '16px', MozOsxFontSmoothing: 'grayscale', overflow: 'clip', overflowWrap: 'anywhere', WebkitFontSmoothing: 'antialiased', width: '390px' }}>
      <div style={{ backgroundColor: '#FFF6DB', borderBottomColor: '#EADBA8', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-warning-ink)', flexShrink: '0', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', lineHeight: '20px', textTransform: 'uppercase', width: '200px' }}>
          States 2–4, 6 · Save bar · Phone
        </div>
        <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', flexBasis: '0%', flexGrow: '1', flexShrink: '1', fontFamily: 'var(--font-sans)', fontSize: '14px', lineHeight: '20px' }}>
          The bar sits 8 px above the floating tab bar, inset 12 px to match it. The failure toast stacks above the bar, full width.
        </div>
      </div>
      <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '64px', paddingInline: '12px', paddingTop: '32px' }}>
        <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', lineHeight: '16px', textTransform: 'uppercase' }}>
            <span style={{ lineHeight: '16px' }}>State 2 · Unsaved changes</span>
          </div>
          <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '12px', boxShadow: '#0000001F 0px 8px 24px', boxSizing: 'border-box', display: 'flex', gap: '12px', justifyContent: 'space-between', minHeight: '64px', paddingBlock: '12px', paddingLeft: '16px', paddingRight: '12px' }}>
            <div style={{ boxSizing: 'border-box', color: 'var(--color-chalk)', flexBasis: '0%', flexGrow: '1', flexShrink: '1', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: '16px' }}>
              <span style={{ lineHeight: '18px' }}>Changes apply to your next weekly schedule.</span>
            </div>
            <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderRadius: '6px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', paddingInline: '20px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, lineHeight: '18px', width: 'max-content' }}>
                Save changes
              </div>
            </div>
          </div>
        </div>
        <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', lineHeight: '16px', textTransform: 'uppercase' }}>
            <span style={{ lineHeight: '16px' }}>State 3 · Saving · button disabled, fields stay visible</span>
          </div>
          <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '12px', boxShadow: '#0000001F 0px 8px 24px', boxSizing: 'border-box', display: 'flex', gap: '12px', justifyContent: 'space-between', minHeight: '64px', paddingBlock: '12px', paddingLeft: '16px', paddingRight: '12px' }}>
            <div style={{ boxSizing: 'border-box', color: 'var(--color-chalk)', flexBasis: '0%', flexGrow: '1', flexShrink: '1', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: '16px' }}>
              <span style={{ lineHeight: '18px' }}>Changes apply to your next weekly schedule.</span>
            </div>
            <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderRadius: '6px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', opacity: '0.6', paddingInline: '20px' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, lineHeight: '18px', width: 'max-content' }}>
                Saving…
              </div>
            </div>
          </div>
        </div>
        <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', lineHeight: '16px', textTransform: 'uppercase' }}>
            <span style={{ lineHeight: '16px' }}>State 4 · Saved · held 6 s, then the bar fades and the page is Clean</span>
          </div>
          <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '12px', boxShadow: '#0000001F 0px 8px 24px', boxSizing: 'border-box', display: 'flex', gap: '12px', justifyContent: 'space-between', minHeight: '64px', paddingBlock: '12px', paddingLeft: '16px', paddingRight: '12px' }}>
            <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
                <path d="M5 12l5 5L19 7" fill="none" stroke="#7EE08F" strokeWidth="2.4" />
              </svg>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-chalk)', display: 'inline-block', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: '16px' }}>
                <span style={{ lineHeight: '18px' }}>Saved. Changes apply to your next weekly schedule.</span>
              </div>
            </div>
            <div style={{ boxSizing: 'border-box', height: '40px' }} />
          </div>
        </div>
        <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', lineHeight: '16px', textTransform: 'uppercase' }}>
            <span style={{ lineHeight: '16px' }}>State 6 · Save failed · the app's failure toast stacks 24 px above the bar; every edit stays</span>
          </div>
          <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: '12px', borderStyle: 'solid', borderWidth: '1px', boxShadow: '#0A0A0A1F 0px 16px 48px', boxSizing: 'border-box', display: 'flex', gap: '12px', marginBottom: '16px', padding: '16px', width: '366px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-danger)" strokeWidth="2" />
                <path d="M12 7.5v5.5M12 16v.5" fill="none" stroke="var(--color-danger)" strokeWidth="2" />
              </svg>
              <div style={{ boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexDirection: 'column', flexGrow: '1', flexShrink: '1', gap: '2px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, lineHeight: '18px' }}>
                  Something went wrong. Try again.
                </div>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: '18px' }}>
                  Error code <span style={{ color: '#C23532', fontFamily: '"Geist Mono", system-ui, sans-serif' }}>3F9A2C1B</span>
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', marginTop: '-12px', width: '44px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="var(--color-smoke)" strokeWidth="2" />
                </svg>
              </div>
            </div>
            <div style={{ alignItems: 'center', backgroundColor: 'var(--color-ink)', borderRadius: '12px', boxShadow: '#0000001F 0px 8px 24px', boxSizing: 'border-box', display: 'flex', gap: '12px', justifyContent: 'space-between', minHeight: '64px', paddingBlock: '12px', paddingLeft: '16px', paddingRight: '12px', width: '100%' }}>
              <div style={{ boxSizing: 'border-box', color: 'var(--color-chalk)', flexBasis: '0%', flexGrow: '1', flexShrink: '1', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: '16px' }}>
                <span style={{ lineHeight: '18px' }}>Changes apply to your next weekly schedule.</span>
              </div>
              <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderRadius: '6px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', paddingInline: '20px' }}>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, lineHeight: '18px', width: 'max-content' }}>
                  Save changes
                </div>
              </div>
            </div>
            <div style={{ alignItems: 'center', backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-vellum-line)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: '1px', boxShadow: '#0000000F 0px 1px 2px', boxSizing: 'border-box', display: 'flex', flexShrink: 0, height: '66px', justifyContent: 'space-around', width: '366px' }}>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
                  <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="#000000" strokeWidth="1.6" />
                  <path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="#000000" strokeWidth="1.6" />
                </svg>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'inline-block', fontFamily: 'var(--font-sans)', fontSize: '12px', lineHeight: '16px' }}>
                  This week
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
                  <path d="M5 20V10M12 20V4M19 20v-6M3 20h18" fill="none" stroke="#000000" strokeWidth="1.6" />
                </svg>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-smoke)', display: 'inline-block', fontFamily: 'var(--font-sans)', fontSize: '12px', lineHeight: '16px' }}>
                  Progress
                </div>
              </div>
              <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
                  <path d="M4 8h16M4 16h16" fill="none" stroke="#000000" strokeWidth="1.6" />
                  <circle cx="9" cy="8" r="2" fill="#FFFFFF" stroke="#000000" strokeWidth="1.6" />
                  <circle cx="15" cy="16" r="2" fill="#FFFFFF" stroke="#000000" strokeWidth="1.6" />
                </svg>
                <div style={{ boxSizing: 'border-box', color: 'var(--color-ink)', display: 'inline-block', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}>
                  Settings
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )