// src/lib/dashboard/PanelRegistry.ts

import { PanelDefinition, PanelType } from '@/types/mosaic';

class PanelRegistry {
  private panels = new Map<PanelType, PanelDefinition>();

  register(definition: PanelDefinition): void {
    if (this.panels.has(definition.type)) {
      console.warn(`Panel type "${definition.type}" is already registered. Overwriting.`);
    }
    this.panels.set(definition.type, definition);
  }

  get(type: PanelType): PanelDefinition | undefined {
    return this.panels.get(type);
  }

  getAll(): PanelDefinition[] {
    return Array.from(this.panels.values());
  }

  getAllByCategory(category: PanelDefinition['category']): PanelDefinition[] {
    return this.getAll().filter(panel => panel.category === category);
  }

  exists(type: PanelType): boolean {
    return this.panels.has(type);
  }

  getCategories(): PanelDefinition['category'][] {
    const categories = new Set<PanelDefinition['category']>();
    this.panels.forEach(panel => categories.add(panel.category));
    return Array.from(categories);
  }

  validatePanelType(type: string): type is PanelType {
    return this.panels.has(type as PanelType);
  }

  unregister(type: PanelType): boolean {
    return this.panels.delete(type);
  }

  clear(): void {
    this.panels.clear();
  }

  getRegisteredTypes(): PanelType[] {
    return Array.from(this.panels.keys());
  }
}

// Singleton instance
export const panelRegistry = new PanelRegistry();

// Helper function for components to use
export function getPanelDefinition(type: PanelType): PanelDefinition | undefined {
  return panelRegistry.get(type);
}

export function getAllPanelDefinitions(): PanelDefinition[] {
  return panelRegistry.getAll();
}

export function getPanelsByCategory(category: PanelDefinition['category']): PanelDefinition[] {
  return panelRegistry.getAllByCategory(category);
}

export default panelRegistry;
