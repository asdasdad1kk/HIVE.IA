const nodemailer =
  require('nodemailer');

const transporter =
  nodemailer.createTransport({
    host:
      'smtp.gac.gulfaero.com',

    port:
      25,

    secure:
      false
  });

async function sendActionPlanMinute(
  payload
) {
  validatePayload(payload);

  const html =
    buildMinuteHtml(payload);

  await transporter.sendMail({
    from:
      'HIVE AI <checkliststudio@gulfstream.com>',

    to:
      payload.recipients.join(','),

    subject:
      payload.subject,

    html
  });

  return true;
}

function buildMinuteHtml(
  payload
) {
  const sections =
    payload.sections
      .map(
        (
          section,
          sectionIndex
        ) =>
          buildSectionHtml(
            section,
            sectionIndex
          )
      )
      .join('');

  const allRows =
    payload.sections.flatMap(
      section =>
        Array.isArray(section.rows)
          ? section.rows
          : []
    );

  const mainRows =
    allRows.filter(
      row =>
        !row.parentId
    );

  const subActions =
    allRows.filter(
      row =>
        Boolean(row.parentId)
    );

  const completeRows =
    mainRows.filter(
      row =>
        displayProgress(
          row,
          allRows
        ) >= 100
    ).length;

  const pendingRows =
    mainRows.filter(
      row =>
        displayProgress(
          row,
          allRows
        ) < 100
    ).length;

  const overallProgress =
    mainRows.length === 0
      ? 0
      : Math.round(
          mainRows.reduce(
            (
              total,
              row
            ) =>
              total +
              displayProgress(
                row,
                allRows
              ),
            0
          ) /
          mainRows.length
        );

  const submittedBy =
    displayName(
      payload.submittedBy
    );

  const generatedAt =
    formatDateTime(
      payload.generatedAt
    );

  return `
<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    ${escapeHtml(payload.subject)}
  </title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #edf2f7;
    color: #172033;
    font-family:
      'Segoe UI',
      Arial,
      Helvetica,
      sans-serif;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      width: 100%;
      background-color: #edf2f7;
    "
  >
    <tr>
      <td
        align="center"
        style="
          padding: 28px 12px;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            max-width: 1180px;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            background-color: #ffffff;
            box-shadow:
              0 12px 32px
              rgba(15, 39, 71, 0.12);
          "
        >
          <!-- Top accent -->

          <tr>
            <td
              style="
                height: 7px;
                background-color: #1f5da8;
                font-size: 0;
                line-height: 0;
              "
            >
              &nbsp;
            </td>
          </tr>

          <!-- Header -->

          <tr>
            <td
              style="
                padding: 28px 34px;
                background-color: #0f2747;
                background-image:
                  linear-gradient(
                    135deg,
                    #0b203c 0%,
                    #123a68 70%,
                    #1f5da8 100%
                  );
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    valign="middle"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          valign="middle"
                          style="
                            width: 58px;
                          "
                        >
                          <div
                            style="
                              width: 48px;
                              height: 48px;
                              border: 1px solid
                                rgba(
                                  255,
                                  255,
                                  255,
                                  0.25
                                );
                              border-radius: 10px;
                              background-color:
                                rgba(
                                  255,
                                  255,
                                  255,
                                  0.10
                                );
                              color: #ffffff;
                              font-size: 20px;
                              font-weight: 700;
                              line-height: 48px;
                              text-align: center;
                            "
                          >
                            H
                          </div>
                        </td>

                        <td
                          valign="middle"
                        >
                          <div
                            style="
                              margin-bottom: 5px;
                              color: #9cc9ff;
                              font-size: 10px;
                              font-weight: 700;
                              letter-spacing: 2px;
                              text-transform: uppercase;
                            "
                          >
                            HIVE AI
                          </div>

                          <h1
                            style="
                              margin: 0;
                              color: #ffffff;
                              font-size: 25px;
                              font-weight: 650;
                              line-height: 1.25;
                            "
                          >
                            ${escapeHtml(
                              payload.templateName
                            )}
                          </h1>

                          <p
                            style="
                              margin:
                                7px 0 0;
                              color: #c9ddf5;
                              font-size: 13px;
                              line-height: 20px;
                            "
                          >
                            Action Plan Meeting Minutes
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td
                    align="right"
                    valign="middle"
                    style="
                      padding-left: 20px;
                    "
                  >
                    <div
                      style="
                        display: inline-block;
                        padding: 8px 13px;
                        border: 1px solid
                          rgba(
                            255,
                            255,
                            255,
                            0.22
                          );
                        border-radius: 999px;
                        background-color:
                          rgba(
                            255,
                            255,
                            255,
                            0.10
                          );
                        color: #ffffff;
                        font-size: 11px;
                        font-weight: 700;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                      "
                    >
                      ${overallProgress}% Overall
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metadata -->

          <tr>
            <td
              style="
                padding: 20px 34px;
                border-bottom:
                  1px solid #dce3ec;
                background-color: #f8fafc;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  ${metadataCell(
                    'Submitted by',
                    submittedBy,
                    payload.submittedBy
                  )}

                  ${metadataCell(
                    'Generated',
                    generatedAt
                  )}

                  ${metadataCell(
                    'Submission',
                    payload.submissionId
                      ? `#${payload.submissionId}`
                      : 'New submission'
                  )}

                  ${metadataCell(
                    'Method',
                    payload.sections
                      .map(
                        section =>
                          section.methodology
                      )
                      .filter(Boolean)
                      .join(' / ') ||
                      'Action Plan'
                  )}
                </tr>
              </table>
            </td>
          </tr>

          <!-- KPI summary -->

          <tr>
            <td
              style="
                padding: 24px 34px 10px;
                background-color: #ffffff;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  table-layout: fixed;
                "
              >
                <tr>
                  ${summaryCard(
                    'Main Actions',
                    mainRows.length,
                    '#1f5da8',
                    '#eaf3ff'
                  )}

                  ${summaryCard(
                    'Sub Actions',
                    subActions.length,
                    '#4472a7',
                    '#edf4fa'
                  )}

                  ${summaryCard(
                    'Pending',
                    pendingRows,
                    '#b7791f',
                    '#fff8e7'
                  )}

                  ${summaryCard(
                    'Completed',
                    completeRows,
                    '#26735b',
                    '#eaf8f2'
                  )}

                  ${summaryCard(
                    'Overall Progress',
                    `${overallProgress}%`,
                    '#123a68',
                    '#eaf1f8',
                    true
                  )}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sections -->

          <tr>
            <td
              style="
                padding:
                  12px 34px 34px;
                background-color: #ffffff;
              "
            >
              ${sections}
            </td>
          </tr>

          <!-- Footer -->

          <tr>
            <td
              style="
                padding: 20px 34px;
                border-top:
                  1px solid #dce3ec;
                background-color: #0f2747;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    style="
                      color: #d1dfef;
                      font-size: 11px;
                      line-height: 18px;
                    "
                  >
                    <strong
                      style="
                        color: #ffffff;
                      "
                    >
                      HIVE AI
                    </strong>

                    <br>

                    Audit · Improve · Verify · Execute
                  </td>

                  <td
                    align="right"
                    style="
                      color: #9eb4cc;
                      font-size: 10px;
                      line-height: 17px;
                    "
                  >
                    This is an automatically generated
                    action-plan summary.

                    <br>

                    Please reply to the action owner
                    for status updates or clarification.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div
          style="
            padding: 14px 20px 0;
            color: #7a8798;
            font-size: 10px;
            line-height: 16px;
            text-align: center;
          "
        >
          HIVE AI · Operational Intelligence Platform
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function buildSectionHtml(
  section,
  sectionIndex
) {
  const rows =
    Array.isArray(section.rows)
      ? section.rows
      : [];

  const mainRows =
    rows.filter(
      row =>
        !row.parentId
    );

  const sectionProgress =
    mainRows.length === 0
      ? 0
      : Math.round(
          mainRows.reduce(
            (
              total,
              row
            ) =>
              total +
              displayProgress(
                row,
                rows
              ),
            0
          ) /
          mainRows.length
        );

  const renderedRows =
    mainRows
      .map(
        (
          row,
          rowIndex
        ) => {
          const children =
            rows.filter(
              child =>
                child.parentId ===
                row.id
            );

          const mainRowHtml =
            buildActionRow({
              row,
              number:
                String(
                  rowIndex + 1
                ),
              progress:
                displayProgress(
                  row,
                  rows
                ),
              isSubAction:
                false,
              hasChildren:
                children.length > 0
            });

          const childrenHtml =
            children
              .map(
                (
                  child,
                  childIndex
                ) =>
                  buildActionRow({
                    row:
                      child,

                    number:
                      `${
                        rowIndex + 1
                      }.${
                        childIndex + 1
                      }`,

                    progress:
                      normalizeProgress(
                        child.progress
                      ),

                    isSubAction:
                      true,

                    hasChildren:
                      false
                  })
              )
              .join('');

          return (
            mainRowHtml +
            childrenHtml
          );
        }
      )
      .join('');

  return `
<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    margin-top:
      ${sectionIndex === 0 ? '8px' : '30px'};
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background-color: #ffffff;
  "
>
  <tr>
    <td
      style="
        padding: 16px 18px;
        border-bottom:
          1px solid #cbd5e1;
        background-color: #123a68;
      "
    >
      <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
      >
        <tr>
          <td>
            <div
              style="
                margin-bottom: 3px;
                color: #9cc9ff;
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
              "
            >
              ${
                escapeHtml(
                  section.methodology ||
                  'ACTION PLAN'
                )
              }
            </div>

            <div
              style="
                color: #ffffff;
                font-size: 17px;
                font-weight: 650;
                line-height: 23px;
              "
            >
              ${
                escapeHtml(
                  section.sectionTitle ||
                  `Action Plan ${
                    sectionIndex + 1
                  }`
                )
              }
            </div>
          </td>

          <td
            align="right"
            style="
              padding-left: 20px;
            "
          >
            <span
              style="
                display: inline-block;
                min-width: 74px;
                padding: 7px 10px;
                border: 1px solid
                  rgba(
                    255,
                    255,
                    255,
                    0.25
                  );
                border-radius: 6px;
                background-color:
                  rgba(
                    255,
                    255,
                    255,
                    0.10
                  );
                color: #ffffff;
                font-size: 12px;
                font-weight: 700;
                text-align: center;
              "
            >
              ${sectionProgress}%
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td>
      <table
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        "
      >
        <thead>
          <tr
            style="
              background-color: #e9eff6;
            "
          >
            ${headerCell('#', '46px', 'center')}
            ${headerCell('Action', '25%')}
            ${headerCell('Responsible', '18%')}
            ${headerCell('ECD', '19%')}
            ${headerCell('Progress', '12%', 'center')}
            ${headerCell('Comments', '22%')}
          </tr>
        </thead>

        <tbody>
          ${
            renderedRows ||
            emptyRowsHtml()
          }
        </tbody>
      </table>
    </td>
  </tr>
</table>
  `;
}

function buildActionRow({
  row,
  number,
  progress,
  isSubAction,
  hasChildren
}) {
  const action =
    escapeHtml(
      row.action ||
      (
        isSubAction
          ? 'Sub action'
          : 'Action'
      )
    );

  const responsibleEmail =
    String(
      row.responsibleEmail ||
      ''
    ).trim();

  const responsibleName =
    displayName(
      responsibleEmail
    );

  const backgroundColor =
    isSubAction
      ? '#f3f7fb'
      : '#ffffff';

  const numberColor =
    isSubAction
      ? '#1f5da8'
      : '#24364b';

  const progressColor =
    getProgressColor(
      progress
    );

  return `
<tr
  style="
    background-color:
      ${backgroundColor};
  "
>
  <td
    valign="top"
    style="
      width: 46px;
      padding: 13px 8px;
      border-right:
        1px solid #d7dee7;
      border-bottom:
        1px solid #d7dee7;
      color: ${numberColor};
      font-size: 11px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
    "
  >
    ${
      isSubAction
        ? `
          <span
            style="
              display: inline-block;
              padding: 3px 5px;
              border: 1px solid #9abadd;
              border-radius: 4px;
              background-color: #e2edf8;
              color: #1f5da8;
            "
          >
            ${escapeHtml(number)}
          </span>
        `
        : escapeHtml(number)
    }
  </td>

  <td
    valign="top"
    style="
      padding: 13px 12px;
      border-right:
        1px solid #d7dee7;
      border-bottom:
        1px solid #d7dee7;
      color: #172033;
      font-size: 12px;
      line-height: 18px;
      word-break: break-word;
    "
  >
    ${
      isSubAction
        ? `
          <div
            style="
              padding-left: 14px;
              border-left:
                3px solid #5d91c8;
            "
          >
            <div
              style="
                margin-bottom: 3px;
                color: #4472a7;
                font-size: 8px;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
              "
            >
              Sub Action
            </div>

            ${action}
          </div>
        `
        : `
          <div
            style="
              font-weight:
                ${hasChildren ? '650' : '500'};
            "
          >
            ${action}
          </div>

          ${
            hasChildren
              ? `
                <div
                  style="
                    margin-top: 5px;
                    color: #55728f;
                    font-size: 9px;
                    font-weight: 600;
                  "
                >
                  Progress calculated from sub actions
                </div>
              `
              : ''
          }
        `
    }
  </td>

  <td
    valign="top"
    style="
      padding: 13px 12px;
      border-right:
        1px solid #d7dee7;
      border-bottom:
        1px solid #d7dee7;
      color: #29394d;
      font-size: 11px;
      line-height: 17px;
      word-break: break-word;
    "
  >
    ${
      responsibleEmail
        ? `
          <div
            style="
              color: #172033;
              font-weight: 650;
            "
          >
            ${escapeHtml(
              responsibleName
            )}
          </div>

          <div
            style="
              margin-top: 3px;
              color: #55728f;
              font-size: 9px;
              line-height: 14px;
            "
          >
            ${escapeHtml(
              responsibleEmail
            )}
          </div>
        `
        : `
          <span
            style="
              color: #8a97a7;
            "
          >
            Unassigned
          </span>
        `
    }
  </td>

  <td
    valign="top"
    style="
      padding: 10px;
      border-right:
        1px solid #d7dee7;
      border-bottom:
        1px solid #d7dee7;
    "
  >
    ${buildEcdHtml(
      row.ecds
    )}
  </td>

  <td
    valign="middle"
    style="
      padding: 13px 10px;
      border-right:
        1px solid #d7dee7;
      border-bottom:
        1px solid #d7dee7;
      text-align: center;
    "
  >
    <div
      style="
        color: ${progressColor};
        font-size: 14px;
        font-weight: 700;
      "
    >
      ${progress}%
    </div>

    <div
      style="
        margin-top: 8px;
        height: 6px;
        overflow: hidden;
        border-radius: 3px;
        background-color: #dfe6ee;
      "
    >
      <div
        style="
          width: ${progress}%;
          height: 6px;
          border-radius: 3px;
          background-color:
            ${progressColor};
        "
      ></div>
    </div>
  </td>

  <td
    valign="top"
    style="
      padding: 13px 12px;
      border-bottom:
        1px solid #d7dee7;
      color: #3b4b5e;
      font-size: 11px;
      line-height: 18px;
      word-break: break-word;
    "
  >
    ${
      row.observations
        ? escapeHtml(
            row.observations
          )
        : `
          <span
            style="
              color: #9aa6b4;
            "
          >
            No comments
          </span>
        `
    }
  </td>
</tr>
  `;
}

function buildEcdHtml(
  ecds
) {
  const values =
    Array.isArray(ecds)
      ? ecds
      : [];

  if (values.length === 0) {
    return `
      <span
        style="
          color: #8a97a7;
          font-size: 10px;
        "
      >
        No ECD
      </span>
    `;
  }

  return values
    .map(
      (
        ecd,
        index
      ) => {
        const status =
          getEcdStatus(
            ecd
          );

        return `
<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    width: 100%;
    ${
      index > 0
        ? 'margin-top: 6px;'
        : ''
    }
  "
>
  <tr>
    <td
      valign="middle"
      style="
        width: 38px;
        color: #536b86;
        font-size: 9px;
        font-weight: 700;
        line-height: 16px;
      "
    >
      ${escapeHtml(
        ecd.label ||
        `ECD${index + 1}`
      )}
    </td>

    <td
      valign="middle"
      style="
        color: #24364b;
        font-size: 10px;
        font-weight: 600;
        line-height: 16px;
      "
    >
      ${
        ecd.date
          ? escapeHtml(
              formatDate(
                ecd.date
              )
            )
          : 'No date'
      }
    </td>

    <td
      align="right"
      valign="middle"
      style="
        width: 70px;
      "
    >
      <span
        style="
          display: inline-block;
          min-width: 60px;
          padding: 3px 5px;
          border: 1px solid
            ${status.border};
          border-radius: 4px;
          background-color:
            ${status.background};
          color:
            ${status.color};
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.4px;
          line-height: 12px;
          text-align: center;
          text-transform: uppercase;
        "
      >
        ${status.label}
      </span>
    </td>
  </tr>
</table>
        `;
      }
    )
    .join('');
}

function getEcdStatus(
  ecd
) {
  if (!ecd?.date) {
    return {
      label:
        'NO DATE',

      color:
        '#65758a',

      border:
        '#bdc8d5',

      background:
        '#f1f4f8'
    };
  }

  const today =
    startOfDay(
      new Date()
    );

  const dueDate =
    parseLocalDate(
      ecd.date
    );

  if (
    !dueDate ||
    Number.isNaN(
      dueDate.getTime()
    )
  ) {
    return {
      label:
        'NO DATE',

      color:
        '#65758a',

      border:
        '#bdc8d5',

      background:
        '#f1f4f8'
    };
  }

  if (
    ecd.completed === true
  ) {
    return {
      label:
        'COMPLETED',

      color:
        '#23644f',

      border:
        '#8bc6af',

      background:
        '#eaf8f2'
    };
  }

  if (
    dueDate.getTime() <
    today.getTime()
  ) {
    return {
      label:
        'OVERDUE',

      color:
        '#a4252e',

      border:
        '#e2a2a7',

      background:
        '#fdecee'
    };
  }

  const days =
    Math.ceil(
      (
        dueDate.getTime() -
        today.getTime()
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );

  if (days <= 3) {
    return {
      label:
        'DUE SOON',

      color:
        '#8a5a12',

      border:
        '#e1bf79',

      background:
        '#fff7df'
    };
  }

  return {
    label:
      'ON TIME',

    color:
      '#23644f',

    border:
      '#8bc6af',

    background:
      '#eaf8f2'
  };
}

function displayProgress(
  row,
  allRows
) {
  const children =
    allRows.filter(
      child =>
        child.parentId ===
        row.id
    );

  if (
    children.length === 0
  ) {
    return normalizeProgress(
      row.progress
    );
  }

  return Math.round(
    children.reduce(
      (
        total,
        child
      ) =>
        total +
        normalizeProgress(
          child.progress
        ),
      0
    ) /
    children.length
  );
}

function normalizeProgress(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(number)
    )
  );
}

function getProgressColor(
  progress
) {
  if (progress >= 100) {
    return '#26735b';
  }

  if (progress >= 80) {
    return '#36906f';
  }

  if (progress >= 50) {
    return '#c18422';
  }

  return '#bd3039';
}

function headerCell(
  label,
  width,
  align = 'left'
) {
  return `
<th
  width="${width}"
  style="
    width: ${width};
    padding: 10px 11px;
    border-right:
      1px solid #c4ceda;
    border-bottom:
      1px solid #c4ceda;
    color: #40546a;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.8px;
    line-height: 14px;
    text-align: ${align};
    text-transform: uppercase;
  "
>
  ${escapeHtml(label)}
</th>
  `;
}

function metadataCell(
  label,
  value,
  email = ''
) {
  const safeValue =
    escapeHtml(
      value || '-'
    );

  const content =
    email
      ? `
        ${escapeHtmlAttribute(email)}
          ${safeValue}
        </a>
      `
      : safeValue;

  return `
<td
  valign="top"
  style="
    padding-right: 22px;
  "
>
  <div
    style="
      margin-bottom: 4px;
      color: #748397;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    "
  >
    ${escapeHtml(label)}
  </div>

  <div
    style="
      color: #24364b;
      font-size: 11px;
      line-height: 17px;
      word-break: break-word;
    "
  >
    ${content}
  </div>
</td>
  `;
}

function summaryCard(
  label,
  value,
  color,
  background,
  last = false
) {
  return `
<td
  width="20%"
  valign="top"
  style="
    width: 20%;
    padding-right:
      ${last ? '0' : '10px'};
  "
>
  <div
    style="
      padding: 14px 12px;
      border: 1px solid #d4dde7;
      border-top:
        4px solid ${color};
      border-radius: 8px;
      background-color:
        ${background};
      text-align: center;
    "
  >
    <div
      style="
        color: ${color};
        font-size: 21px;
        font-weight: 700;
        line-height: 25px;
      "
    >
      ${escapeHtml(value)}
    </div>

    <div
      style="
        margin-top: 4px;
        color: #65758a;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
      "
    >
      ${escapeHtml(label)}
    </div>
  </div>
</td>
  `;
}

function emptyRowsHtml() {
  return `
<tr>
  <td
    colspan="6"
    style="
      padding: 28px;
      color: #7a8798;
      font-size: 11px;
      text-align: center;
    "
  >
    No actions were included in this section.
  </td>
</tr>
  `;
}

function displayName(
  email
) {
  const text =
    String(email || '')
      .trim();

  if (!text) {
    return 'Unknown user';
  }

  const local =
    (
      text.split('@')[0] ||
      text
    )
      .replace(
        /\d+$/g,
        ''
      );

  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map(
        part =>
          part.charAt(0)
            .toUpperCase() +
          part.slice(1)
            .toLowerCase()
      )
      .join(' ') ||
    text
  );
}

function formatDateTime(
  value
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value || '-'
    );
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      year:
        'numeric',

      month:
        'short',

      day:
        '2-digit',

      hour:
        '2-digit',

      minute:
        '2-digit'
    }
  ).format(date);
}

function formatDate(
  value
) {
  const date =
    parseLocalDate(value);

  if (
    !date ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value || '-'
    );
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      year:
        'numeric',

      month:
        'short',

      day:
        '2-digit'
    }
  ).format(date);
}

function parseLocalDate(
  value
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(
        String(value || '')
      );

  if (!match) {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
}

function startOfDay(
  date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function validatePayload(
  payload
) {
  if (
    !payload ||
    typeof payload !== 'object'
  ) {
    throw new Error(
      'Invalid action plan minute payload.'
    );
  }

  if (
    !Array.isArray(
      payload.recipients
    ) ||
    payload.recipients.length === 0
  ) {
    throw new Error(
      'The action plan does not have recipients.'
    );
  }

  if (
    !Array.isArray(
      payload.sections
    )
  ) {
    throw new Error(
      'The action plan does not contain sections.'
    );
  }
}

function escapeHtml(
  value
) {
  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

function escapeHtmlAttribute(
  value
) {
  return escapeHtml(value)
    .replace(
      /`/g,
      '&#096;'
    );
}

module.exports = {
  sendActionPlanMinute
};