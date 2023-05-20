import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from 'database/dataSource';

import { Person } from 'entities/Person/Person';
import { CustomError } from 'utils/customError';

export async function getPersons(req: Request, res: Response, next: NextFunction) {
  const personRepository = await AppDataSource.getRepository(Person);

  try {
    const persons = await personRepository.find({
      select: ['id', 'name', 'email', 'institution'],
    });
    res.status(200).send(persons);
  } catch (err) {
    const customError = new CustomError(400, 'Raw', 'Cant retrieve list of persons', null, err);
    return next(customError);
  }
}

export async function getPersonById(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);

  const personRepository = await AppDataSource.getRepository(Person);

  try {
    const person = await personRepository.findOne({
      where: {
        id: id,
      },
      select: ['id', 'name', 'email', 'institution'],
      relations: ['personProjects'],
    });

    if (!person) {
      const customError = new CustomError(404, 'Not Found', 'User not found', ['User not found']);
      return next(customError);
    }

    res.status(200).send(person);
  } catch (err) {
    const customError = new CustomError(400, 'Raw', `Can't retrieve list of users.`, null, err);
    return next(customError);
  }
}