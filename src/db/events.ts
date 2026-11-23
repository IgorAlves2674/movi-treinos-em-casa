/**
 * Aviso simples de "os dados locais mudaram". Disparado por gravações locais e
 * pela sincronização, para as telas recarregarem e para agendar o envio.
 */
export type ChangeSource = 'local' | 'sync';
type Listener = (tables: readonly string[], source: ChangeSource) => void;

const listeners = new Set<Listener>();

export function onDataChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDataChange(tables: readonly string[], source: ChangeSource): void {
  for (const l of listeners) l(tables, source);
}
