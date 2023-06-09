import { PersonProject } from 'entities/personProject/PersonProject';
import { Result } from 'entities/result/Result';
import { Collaborator } from 'entities/personProject/types';
import { deletePersonProject, fetchPersonProject, savePersonProject } from 'services/personProject';
import { saveProject } from 'services/project';
import { deleteResult, fetchRawResult } from 'services/result';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('Project')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    nullable: true,
  })
  sponsor: string;

  @OneToMany(() => Result, (result) => result.project, { onDelete: 'CASCADE' })
  results: Result[];

  @OneToMany(() => PersonProject, (personProject) => personProject.project, { onDelete: 'CASCADE' })
  personProjects: PersonProject[];

  @Column({ default: null })
  startDate: Date;

  @Column({ default: null })
  finishDate: Date;

  @Column({ default: false })
  isFinished: boolean;

  @Column()
  @CreateDateColumn()
  created_at: Date;

  @Column()
  @UpdateDateColumn()
  updated_at: Date;

  hasResult(resultId: number): boolean {
    return this.results.some((result) => result.id === resultId);
  }

  personAlreadyMember(personId: number): boolean {
    return this.personProjects.some((personProject) => personProject.person_id === personId);
  }

  async editMembers(persons: { id: number; role: string }[]): Promise<void> {
    for (const person of persons) {
      if (!this.personAlreadyMember(person.id)) {
        console.log('Is member already');
        await this.addMember(person.id, person.role);
      } else {
        await this.editExistingMember(person.id, person.role);
      }
    }

    await saveProject(this);
  }

  async addMember(personId: number, personRole: string): Promise<void> {
    const newPersonProject = new PersonProject();
    newPersonProject.project_id = this.id;
    newPersonProject.person_id = personId;

    if (isStringInEnum(personRole, Collaborator)) {
      newPersonProject.role = personRole as Collaborator;
    } else {
      newPersonProject.role = Collaborator.MEMBER;
    }

    this.personProjects.push(await savePersonProject(newPersonProject));
  }

  async addResultToProject(resultId: number): Promise<void> {
    const newResult = await fetchRawResult(resultId);
    if (!newResult) {
      throw new Error('Could not find result');
    } else {
      this.results.push(newResult);
      await saveProject(this);
    }
  }

  async removePersonToProject(personId: number): Promise<void> {
    try {
      const personProject = await fetchPersonProject(personId, this.id);
      await deletePersonProject(personProject);
      this.personProjects = this.personProjects.filter((pp) => personProject.id != pp.id);
      await saveProject(this);
    } catch (err) {
      throw new Error(`Provided person not related to project`);
    }
  }

  async editExistingMember(personId: number, role: string) {
    const personProject = this.personProjects.find((p) => p.person_id == personId);

    if (!isStringInEnum(role, Collaborator)) {
      throw new Error('Could not edit member');
    } else {
      personProject.role = role as Collaborator;
      await savePersonProject(personProject);
    }
  }

  async removeResultFromProject(resultId: number) {
    try {
      await deleteResult(resultId);
      this.results = this.results.filter((r) => r.id != resultId);
      await saveProject(this);
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

function isStringInEnum(value: string, enumObj: any): boolean {
  return Object.values(enumObj).includes(value);
}
