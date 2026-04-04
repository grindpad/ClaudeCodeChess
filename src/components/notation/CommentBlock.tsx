import React from 'react';
import { StyleSheet, Text } from 'react-native';

interface CommentBlockProps {
  text: string;
}

export default function CommentBlock({ text }: CommentBlockProps) {
  if (!text.trim()) return null;
  return <Text style={styles.comment}>{text.trim()}</Text>;
}

const styles = StyleSheet.create({
  comment: {
    color: '#90a4ae',
    fontSize: 12,
    fontStyle: 'italic',
    // Takes full width so next move starts on a new "line" in the wrapping flow
    flexBasis: '100%',
    paddingHorizontal: 6,
    paddingVertical: 3,
    lineHeight: 18,
  },
});
