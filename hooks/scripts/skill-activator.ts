/**
 * skill-activator.ts - Dynamic skill activation based on context
 *
 * This script analyzes the current conversation context and suggests
 * or activates appropriate skills.
 *
 * Usage:
 *   npx ts-node skill-activator.ts analyze "<user_message>"
 *   npx ts-node skill-activator.ts suggest
 */

import * as fs from 'fs';
import * as path from 'path';

interface Skill {
  name: string;
  description: string;
  triggers: string[];
  path: string;
}

interface SkillMatch {
  skill: Skill;
  confidence: number;
  matchedTriggers: string[];
}

// Load all available skills
function loadSkills(skillsDir: string): Skill[] {
  const skills: Skill[] = [];

  if (!fs.existsSync(skillsDir)) {
    return skills;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const skill = parseSkillFile(content, skillPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }
  }

  return skills;
}

// Parse SKILL.md frontmatter
function parseSkillFile(content: string, filePath: string): Skill | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');

  let name = '';
  let description = '';
  const triggers: string[] = [];
  let inTriggers = false;

  for (const line of lines) {
    if (line.startsWith('name:')) {
      name = line.replace('name:', '').trim();
    } else if (line.startsWith('description:')) {
      description = line.replace('description:', '').trim();
    } else if (line.startsWith('triggers:')) {
      inTriggers = true;
    } else if (inTriggers && line.startsWith('  -')) {
      triggers.push(line.replace('  -', '').trim().replace(/['"]/g, ''));
    } else if (!line.startsWith('  ') && line.includes(':')) {
      inTriggers = false;
    }
  }

  if (!name) {
    return null;
  }

  return { name, description, triggers, path: filePath };
}

// Analyze user message for skill matches
function analyzeMessage(message: string, skills: Skill[]): SkillMatch[] {
  const matches: SkillMatch[] = [];
  const lowerMessage = message.toLowerCase();

  for (const skill of skills) {
    const matchedTriggers: string[] = [];

    for (const trigger of skill.triggers) {
      const lowerTrigger = trigger.toLowerCase();
      if (lowerMessage.includes(lowerTrigger)) {
        matchedTriggers.push(trigger);
      }
    }

    if (matchedTriggers.length > 0) {
      // Calculate confidence based on number of matches and specificity
      const confidence = Math.min(
        0.5 + matchedTriggers.length * 0.2,
        1.0
      );

      matches.push({
        skill,
        confidence,
        matchedTriggers,
      });
    }
  }

  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence);
}

// Format output for Claude
function formatOutput(matches: SkillMatch[]): string {
  if (matches.length === 0) {
    return JSON.stringify({ status: 'no_match', suggestions: [] });
  }

  const suggestions = matches.map((m) => ({
    skill: m.skill.name,
    confidence: m.confidence,
    description: m.skill.description,
    triggers: m.matchedTriggers,
    activation: `Use skill: ${m.skill.name}`,
  }));

  return JSON.stringify({
    status: 'match',
    suggestions,
    recommended: suggestions[0],
  });
}

// Main
function main(): void {
  const args = process.argv.slice(2);
  const command = args[0] || 'suggest';

  const projectRoot = process.env.CLAUDE_PROJECT_ROOT || '.';
  const skillsDir = path.join(projectRoot, '.claude', 'skills');

  const skills = loadSkills(skillsDir);

  if (command === 'analyze' && args[1]) {
    const message = args[1];
    const matches = analyzeMessage(message, skills);
    console.log(formatOutput(matches));
  } else if (command === 'suggest') {
    // List all available skills
    const output = {
      status: 'available',
      skills: skills.map((s) => ({
        name: s.name,
        description: s.description,
        triggers: s.triggers,
      })),
    };
    console.log(JSON.stringify(output));
  } else if (command === 'list') {
    // Simple list
    for (const skill of skills) {
      console.log(`- ${skill.name}: ${skill.description}`);
    }
  } else {
    console.error('Usage: skill-activator.ts {analyze "<message>"|suggest|list}');
    process.exit(1);
  }
}

main();
