import { schemaToPromptContext } from '../services/schemaUtils';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

const SYSTEM_PROMPT = `You are a SQL generator for an H1B visa data explorer. Generate DuckDB-compatible SQL.

DATA CONTEXT:
- CASE_STATUS values: 'Certified', 'Denied', 'Withdrawn' (case-sensitive!)
- WAGE_RATE_OF_PAY_FROM: annual salary in USD
- NEW_EMPLOYMENT: 1 if new hire, 0 otherwise
- CONTINUED_EMPLOYMENT: 1 if continuing, 0 otherwise

RULES:
1. Output ONLY valid JSON: {"sql": "...", "schema": [{"name": "...", "type": "..."}]}
2. If user request is unclear, output: {"error": "your direct question here"}
3. Be AGGRESSIVE. If something is ambiguous, demand clarification. No guessing.
4. SQL must reference {parent} as the source table - it will be replaced with actual CTE name
5. Schema must list ALL output columns with types (VARCHAR, INTEGER, DOUBLE, BIGINT, BOOLEAN)
6. Supported operations: SELECT, WHERE, GROUP BY, HAVING, ORDER BY, aggregations (COUNT, SUM, AVG, MIN, MAX)
7. No CTEs, no subqueries, no JOINs - single SELECT statement only
8. Column names AND values are case-sensitive, use exact names/values

RESPONSE FORMAT:
- Success: {"sql": "SELECT ... FROM {parent} WHERE ...", "schema": [{"name": "col1", "type": "VARCHAR"}]}
- Need clarification: {"error": "What salary range? Give me numbers."}`;

export const generateSQL = async (prompt, parentSchema) => {
  const schemaContext = schemaToPromptContext(parentSchema);
  
  const userMessage = `Parent table columns: ${schemaContext}

User request: "${prompt}"

Generate SQL. Be aggressive if unclear.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (result.error) {
      console.log('[AI] Clarification needed:', result.error);
      return { success: false, error: result.error };
    }
    
    if (!result.sql || !result.schema) {
      throw new Error('Missing sql or schema in response');
    }

    console.log('[AI] Generated SQL:', result.sql);
    console.log('[AI] Output schema:', result.schema);

    return { success: true, sql: result.sql, schema: result.schema };
  } catch (e) {
    console.error('AI generation error:', e);
    return { success: false, error: e.message };
  }
};
