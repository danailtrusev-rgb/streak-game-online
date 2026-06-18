// Scene Editor — Layer List panel
// Shows all layers sorted by zIndex with visibility/lock controls and reorder actions.

import { useState, useRef, useCallback } from 'react';
import {
  ChevronUp, ChevronDown, Copy, Trash2, Plus, Pencil,
  Eye, EyeOff, Lock, Unlock, Image, Type, Zap, Square, Layers, GripVertical,
} from 'lucide-react';
import type { SceneLayer, LayerType } from '../../../lib/types';

const UF = "'Inter', system-ui, sans-serif";

const TYPE_ICONS: Record<LayerType, React.ReactNode> = {
  image:   <Image   size={10} strokeWidth={1.5} />,
  text:    <Type    size={10} strokeWidth={1.5} />,
  effect:  <Zap     size={10} strokeWidth={1.5} />,
  particle:<Layers  size={10} strokeWidth={1.5} />,
  button:  <Square  size={10} strokeWidth={1.5} />,
  overlay: <Square  size={10} strokeWidth={1.5} />,
};

const ROLE_COLOR: Record<string, string> = {
  background:          'rgba(90,130,200,0.7)',
  gate_door_left:      'rgba(120,200,90,0.7)',
  gate_door_right:     'rgba(120,200,90,0.7)',
  choice_object:       'rgba(255,154,48,0.8)',
  torch_flame:         'rgba(255,100,30,0.7)',
  particle_effect:     'rgba(180,220,130,0.7)',
  atmosphere_effect:   'rgba(100,160,220,0.6)',
  text:                'rgba(200,200,120,0.7)',
  button:              'rgba(120,180,255,0.7)',
  foreground_decoration: 'rgba(160,140,90,0.7)',
};

function roleColor(role: string): string {
  return ROLE_COLOR[role] ?? 'rgba(255,255,255,0.32)';
}

interface Props {
  layers:          SceneLayer[];
  selectedId:      string | null;
  onSelect:        (id: string) => void;
  onOpenSettings:  (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked:  (id: string) => void;
  onMoveUp:        (id: string) => void;
  onMoveDown:      (id: string) => void;
  onReorder:       (draggedId: string, targetId: string) => void;
  onDuplicate:     (id: string) => void;
  onDelete:        (id: string) => void;
  onAddLayer:      (type: LayerType) => void;
}

export default function SceneEditorLayerList({
  layers, selectedId,
  onSelect, onOpenSettings, onToggleVisible, onToggleLocked,
  onMoveUp, onMoveDown, onReorder, onDuplicate, onDelete, onAddLayer,
}: Props) {
  // highest z on top in list
  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  // Drag-to-reorder state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggingId = useRef<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggingId.current) setDragOverId(id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const srcId = draggingId.current;
    draggingId.current = null;
    setDragOverId(null);
    if (srcId && srcId !== targetId) onReorder(srcId, targetId);
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    draggingId.current = null;
    setDragOverId(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderBottom: '1px solid rgba(40,55,42,0.4)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, fontFamily: UF, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          Layers
        </span>
        <span style={{ fontSize: 9, fontFamily: UF, color: 'rgba(255,255,255,0.25)' }}>
          {layers.length}
        </span>
      </div>

      {/* Layer rows */}
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {sorted.map((layer) => {
          const isSelected = layer.id === selectedId;
          const isDragOver = layer.id === dragOverId;
          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, layer.id)}
              onDragOver={(e) => handleDragOver(e, layer.id)}
              onDrop={(e) => handleDrop(e, layer.id)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(layer.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 8px',
                background: isDragOver
                  ? 'rgba(245,208,96,0.12)'
                  : isSelected
                  ? 'rgba(245,208,96,0.08)'
                  : 'transparent',
                borderLeft: `2px solid ${isSelected ? 'rgba(245,208,96,0.5)' : 'transparent'}`,
                borderBottom: isDragOver
                  ? '1px solid rgba(245,208,96,0.5)'
                  : '1px solid rgba(30,40,32,0.5)',
                cursor: 'pointer',
                transition: 'background 0.1s ease',
              }}
            >
              {/* Drag handle */}
              <span
                style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0, lineHeight: 0, cursor: 'grab' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GripVertical size={10} strokeWidth={1.5} />
              </span>

              {/* Type icon */}
              <span style={{ color: roleColor(layer.role), flexShrink: 0, lineHeight: 0 }}>
                {TYPE_ICONS[layer.type] ?? <Image size={10} />}
              </span>

              {/* Name + role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, fontFamily: UF,
                  color: isSelected ? 'rgba(245,208,96,0.9)' : 'rgba(255,255,255,0.65)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {layer.name}
                </div>
                <div style={{
                  fontSize: 8, fontFamily: UF, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: roleColor(layer.role), marginTop: 1,
                }}>
                  {layer.role}
                </div>
              </div>

              {/* z-index badge */}
              <span style={{
                fontSize: 8, fontFamily: UF, color: 'rgba(255,255,255,0.22)',
                background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 2,
                flexShrink: 0,
              }}>
                {layer.zIndex}
              </span>

              {/* Visible toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisible(layer.id); }}
                title={layer.visible ? 'Hide' : 'Show'}
                style={{
                  background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
                  color: layer.visible ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)',
                  lineHeight: 0, flexShrink: 0,
                }}
              >
                {layer.visible ? <Eye size={11} strokeWidth={1.5} /> : <EyeOff size={11} strokeWidth={1.5} />}
              </button>

              {/* Locked toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLocked(layer.id); }}
                title={layer.locked ? 'Unlock' : 'Lock'}
                style={{
                  background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
                  color: layer.locked ? 'rgba(255,154,48,0.6)' : 'rgba(255,255,255,0.18)',
                  lineHeight: 0, flexShrink: 0,
                }}
              >
                {layer.locked ? <Lock size={11} strokeWidth={1.5} /> : <Unlock size={11} strokeWidth={1.5} />}
              </button>

              {/* Edit button */}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSettings(layer.id); }}
                title="Edit layer settings"
                style={{
                  background: isSelected ? 'rgba(245,208,96,0.1)' : 'none',
                  border: `1px solid ${isSelected ? 'rgba(245,208,96,0.25)' : 'rgba(50,70,50,0.35)'}`,
                  padding: '2px 4px', cursor: 'pointer',
                  color: isSelected ? 'rgba(245,208,96,0.75)' : 'rgba(255,255,255,0.3)',
                  lineHeight: 0, flexShrink: 0,
                  transition: 'all 0.12s ease',
                }}
              >
                <Pencil size={9} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Layer actions for selected */}
      {selectedId && (
        <div style={{
          display: 'flex', gap: 4, padding: '6px 8px', flexShrink: 0,
          borderTop: '1px solid rgba(40,55,42,0.4)', flexWrap: 'wrap',
        }}>
          {/* Up in visual list = higher z */}
          <IconBtn onClick={() => onMoveUp(selectedId)}   title="Move up (higher z)"   icon={<ChevronUp   size={12} />} />
          <IconBtn onClick={() => onMoveDown(selectedId)} title="Move down (lower z)"  icon={<ChevronDown size={12} />} />
          <IconBtn onClick={() => onDuplicate(selectedId)} title="Duplicate" icon={<Copy  size={12} />} />
          <IconBtn
            onClick={() => onDelete(selectedId)}
            title="Delete layer"
            icon={<Trash2 size={12} />}
            danger
          />
        </div>
      )}

      {/* Add layer buttons */}
      <div style={{
        padding: '6px 8px', borderTop: '1px solid rgba(40,55,42,0.4)',
        display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0,
      }}>
        <AddBtn label="+ Image"  onClick={() => onAddLayer('image')} />
        <AddBtn label="+ Text"   onClick={() => onAddLayer('text')} />
        <AddBtn label="+ Effect" onClick={() => onAddLayer('effect')} />
        <AddBtn label="+ Button" onClick={() => onAddLayer('button')} />
        <AddBtn label="+ Choice" onClick={() => onAddLayer('image')} title="choice object" />
      </div>
    </div>
  );
}

function IconBtn({
  onClick, title, icon, danger = false,
}: { onClick: () => void; title: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '4px 6px', background: 'transparent', cursor: 'pointer',
        border: `1px solid ${danger ? 'rgba(180,40,40,0.35)' : 'rgba(50,70,50,0.4)'}`,
        color: danger ? 'rgba(200,60,60,0.75)' : 'rgba(255,255,255,0.45)',
        transition: 'all 0.15s ease',
        lineHeight: 0,
      }}
    >
      {icon}
    </button>
  );
}

function AddBtn({
  label, onClick, title,
}: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '4px 8px', fontSize: 9, fontFamily: UF,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        background: 'rgba(30,42,32,0.5)', cursor: 'pointer',
        border: '1px solid rgba(50,70,50,0.4)',
        color: 'rgba(255,255,255,0.45)',
        transition: 'all 0.15s ease',
      }}
    >
      <Plus size={9} strokeWidth={2} />
      {label.replace('+ ', '')}
    </button>
  );
}
