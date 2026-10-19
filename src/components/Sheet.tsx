import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Folha inferior modal: foco preso, Esc fecha, scrim clicável e foco devolvido ao fechar.
 * O botão Voltar do Android é tratado pelo SheetHost (uma entrada de histórico por folha aberta).
 */
export function Sheet({
  titulo,
  subtitulo,
  onClose,
  children,
  rodape,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const primeiro = el?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button:not(.x)');
    (primeiro ?? el)?.focus();
    return () => origem?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const focaveis = ref.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
    );
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (!primeiro || !ultimo) return;
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <>
      <button type="button" className="scrim" aria-label="Fechar" tabIndex={-1} onClick={onClose} />
      <section ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="sheet-body gut">
          <div className="grab" />
          <div className="sheet-h">
            <div style={{ minWidth: 0 }}>
              <p className="h2">{titulo}</p>
              {subtitulo && <p className="sub">{subtitulo}</p>}
            </div>
            <button type="button" className="x" aria-label="Fechar" onClick={onClose}>
              ×
            </button>
          </div>
          {children}
        </div>
        {rodape && <div className="sheet-foot gut">{rodape}</div>}
      </section>
    </>
  );
}
