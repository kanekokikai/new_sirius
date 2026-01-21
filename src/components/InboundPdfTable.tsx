import React, { useMemo } from "react";

type Props = {
  columns: string[];
  rows: string[][];
  /** columns that should be merged vertically when subsequent rows are blank */
  mergeColumnIndices: number[];
  /** if true, merge mergeColumnIndices within each group even when anchor cell is blank (spreadsheet-like merged blanks) */
  mergeBlankCellsWithinGroup?: boolean;
  /** columns that indicate the start of a new group (for thicker top border) */
  groupStartColumnIndices?: number[];
  /** optional column widths (CSS width values), same length as columns */
  colWidths?: Array<string | undefined>;
  ariaLabel?: string;
};

type SpanMap = number[][];

const normalize = (v: unknown) => (v == null ? "" : String(v));

export const InboundPdfTable: React.FC<Props> = ({
  columns,
  rows,
  mergeColumnIndices,
  mergeBlankCellsWithinGroup = false,
  groupStartColumnIndices = [0, 1],
  colWidths,
  ariaLabel
}) => {
  const normalizedRows = useMemo(() => {
    return rows.map((r) => {
      const next = Array.from({ length: columns.length }).map((_, idx) => normalize(r[idx] ?? ""));
      return next;
    });
  }, [columns.length, rows]);

  const spans: SpanMap = useMemo(() => {
    const map: SpanMap = Array.from({ length: normalizedRows.length }).map(() =>
      Array.from({ length: columns.length }).map(() => 1)
    );

    const groupStarts = normalizedRows.map((row) =>
      groupStartColumnIndices.some((col) => (row[col] ?? "").trim().length > 0)
    );
    const groupEndIndex = (start: number) => {
      for (let i = start + 1; i < groupStarts.length; i += 1) {
        if (groupStarts[i]) return i;
      }
      return groupStarts.length;
    };

    if (mergeBlankCellsWithinGroup) {
      for (let i = 0; i < normalizedRows.length; i += 1) {
        if (!groupStarts[i]) continue;
        const end = groupEndIndex(i);
        const span = end - i;
        for (const col of mergeColumnIndices) {
          map[i][col] = span;
          for (let k = i + 1; k < end; k += 1) map[k][col] = 0;
        }
      }
      return map;
    }

    for (const col of mergeColumnIndices) {
      let i = 0;
      while (i < normalizedRows.length) {
        const cell = normalizedRows[i]?.[col] ?? "";
        if (!cell) {
          // no anchor cell -> render normally
          map[i][col] = 1;
          i += 1;
          continue;
        }
        let span = 1;
        let j = i + 1;
        while (j < normalizedRows.length && !(normalizedRows[j]?.[col] ?? "").trim()) {
          span += 1;
          j += 1;
        }
        map[i][col] = span;
        for (let k = i + 1; k < j; k += 1) {
          map[k][col] = 0; // skip rendering cell
        }
        i = j;
      }
    }

    return map;
  }, [columns.length, mergeColumnIndices, normalizedRows]);

  const isGroupStartRow = (row: string[]) =>
    groupStartColumnIndices.some((col) => (row[col] ?? "").trim().length > 0);

  return (
    <div className="table-container">
      <table className="inbound-pdf-table" aria-label={ariaLabel}>
        <colgroup>
          {columns.map((_, idx) => (
            <col key={`col-${idx}`} style={colWidths?.[idx] ? { width: colWidths[idx] } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={`th-${idx}`} data-col={idx}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {normalizedRows.map((row, rIdx) => (
            <tr key={`r-${rIdx}`} className={isGroupStartRow(row) ? "inbound-pdf-row-start" : undefined}>
              {columns.map((_, cIdx) => {
                const span = spans[rIdx]?.[cIdx] ?? 1;
                if (mergeColumnIndices.includes(cIdx) && span === 0) return null;
                return (
                  <td key={`td-${rIdx}-${cIdx}`} data-col={cIdx} rowSpan={span > 1 ? span : undefined}>
                    {row[cIdx]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

