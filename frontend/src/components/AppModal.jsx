import React from 'react';
import { Modal } from 'antd';

/**
 * AppModal — global wrapper around AntD Modal that enforces the app's
 * consistent modal sizing:
 *   - width: 70vw (with sensible min/max bounds)
 *   - body: max-height 80vh, scrollable when content overflows
 *
 * All other props are forwarded to AntD <Modal>.
 *
 * Note: AntD's ConfigProvider `modal` config only applies to imperative
 * helpers (Modal.confirm / Modal.info), NOT to JSX <Modal> components.
 * So we apply width/styles directly here.
 */
export default function AppModal({ width = '70vw', minWidth = 520, maxWidth = 1100, bodyMaxHeight = '80vh', styles, ...rest }) {
  const computedWidth = typeof width === 'number' ? width : width;
  return (
    <Modal
      width={computedWidth}
      style={{ maxWidth }}
      styles={{
        body: { maxHeight: bodyMaxHeight, overflowY: 'auto' },
        ...(styles || {})
      }}
      {...rest}
    />
  );
}