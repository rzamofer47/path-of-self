import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppTheme, SkillNode } from '@/src/types';

interface NodeRenameModalProps {
  visible: boolean;
  node: SkillNode | null;
  theme: AppTheme;
  onClose: () => void;
  onSubmit: (node: SkillNode, name: string) => void | Promise<void>;
}

export function NodeRenameModal({
  visible,
  node,
  theme,
  onClose,
  onSubmit,
}: NodeRenameModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible && node) {
      setName(node.name);
    }
  }, [visible, node?.id, node?.name]);

  if (!node) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === node.name) {
      onClose();
      return;
    }
    void Promise.resolve(onSubmit(node, trimmed)).finally(() => onClose());
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.panel, { borderColor: theme.primary }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.primary }]}>Renombrar habilidad</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.primary }]}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del nodo"
            placeholderTextColor={theme.textMuted}
            autoFocus
            selectTextOnFocus
            onSubmitEditing={handleSave}
          />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.btn}>
              <Text style={{ color: theme.textMuted }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.btnPrimaryText}>Guardar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    backgroundColor: '#0a0e14',
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimary: {
    minWidth: 88,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#0a0e14',
    fontWeight: '800',
  },
});
