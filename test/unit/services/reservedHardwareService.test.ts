import { HardwareService, ReservedHardwareService } from "../../../src/services/hardware";
import { createTestDatabaseConnection, closeTestDatabaseConnection, reloadTestDatabaseConnection, initEnv } from "../../util/testUtils";
import { getRepository, Repository } from "typeorm";
import { User, AchievementProgress, ReservedHardwareItem, HardwareItem } from "../../../src/db/entity/hub";
import { HttpResponseCode } from "../../../src/util/errorHandling";

const piHardwareItem: HardwareItem = new HardwareItem();
piHardwareItem.name = "Pi";
piHardwareItem.totalStock = 5;
piHardwareItem.reservedStock = 0;
piHardwareItem.takenStock = 0;
piHardwareItem.itemURL = "";

const viveHardwareItem: HardwareItem = new HardwareItem();
viveHardwareItem.name = "Vive";
viveHardwareItem.totalStock = 2;
viveHardwareItem.reservedStock = 0;
viveHardwareItem.takenStock = 0;
viveHardwareItem.itemURL = "";

const testUser: User = new User();
testUser.name = "Billy Tester II";
testUser.email = "billyII@testing-validation.com";
testUser.password = "pbkdf2_sha256$30000$xmAiV8Wihzn5$BBVJrxmsVASkYuOI6XdIZoYLfy386hdMOF8S14WRTi8=";
testUser.authLevel = 1;
testUser.team = "TeamCodeHere-";
testUser.push_id = ["a64a87ad-df62-47c7-9592-85d71291abf2"];

const itemReservation: ReservedHardwareItem = new ReservedHardwareItem();
itemReservation.reservationToken = "token";
itemReservation.isReserved = true;
itemReservation.reservationQuantity = 1;
itemReservation.reservationExpiry = new Date(new Date().getTime() + (10000 * 60));

let reservedHardwareService: ReservedHardwareService;

beforeAll(async (done: jest.DoneCallback): Promise<void> => {
  initEnv();

  await createTestDatabaseConnection([ User, AchievementProgress, ReservedHardwareItem, HardwareItem ]);
  reservedHardwareService = new ReservedHardwareService(getRepository(ReservedHardwareItem));

  done();
});

beforeEach(async (done: jest.DoneCallback): Promise<void> => {
  await reloadTestDatabaseConnection();

  done();
});

/**
 * Hardware service tests
 */
describe("Hardware service tests", (): void => {
  /**
   * Test getAllReservations
   */
  describe("getAllReservations tests", (): void => {
    let hardwareRepository: Repository<HardwareItem>;
    let userRepository: Repository<User>;
    let reservedHardwareRepository: Repository<ReservedHardwareItem>;

    beforeEach(async (): Promise<void> => {
      hardwareRepository = getRepository(HardwareItem);
      userRepository = getRepository(User);
      reservedHardwareRepository = getRepository(ReservedHardwareItem);
      await userRepository.save(testUser);
      await hardwareRepository.save(piHardwareItem);
      await hardwareRepository.save(viveHardwareItem);
    });

    test("Should ensure all reservations can be found", async (): Promise<void> => {
      // Test setup
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: piHardwareItem, reservationToken: `${itemReservation.reservationToken}1`});
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: viveHardwareItem, reservationToken: `${itemReservation.reservationToken}2`});

      // Perform the test
      const allReservations: ReservedHardwareItem[] = await reservedHardwareService.getAllReservations();
      expect(allReservations.length).toBe(2);
    });

    test("Should ensure empty array returned when no reservations", async (): Promise<void> => {
      // Perform the test
      const allReservations: ReservedHardwareItem[] = await reservedHardwareService.getAllReservations();
      expect(allReservations).toEqual([]);
      expect(allReservations.length).toBe(0);
    });
  });

  /**
   * Test getReservation
   */
  describe("getReservation tests", (): void => {
    let hardwareRepository: Repository<HardwareItem>;
    let userRepository: Repository<User>;
    let reservedHardwareRepository: Repository<ReservedHardwareItem>;

    beforeEach(async (): Promise<void> => {
      hardwareRepository = getRepository(HardwareItem);
      userRepository = getRepository(User);
      reservedHardwareRepository = getRepository(ReservedHardwareItem);
      await userRepository.save(testUser);
      await hardwareRepository.save(piHardwareItem);
      await hardwareRepository.save(viveHardwareItem);
    });

    test("Should ensure reservation can be found by token", async (): Promise<void> => {
      // Test setup
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: piHardwareItem, reservationToken: `${itemReservation.reservationToken}1`});
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: viveHardwareItem, reservationToken: `${itemReservation.reservationToken}2`});

      // Perform the test
      const tokenToFind: string = `${itemReservation.reservationToken}2`;
      const reservation: ReservedHardwareItem = await reservedHardwareService.getReservation(tokenToFind);
      expect(reservation).toBeDefined();
      expect(reservation.hardwareItem).toEqual(viveHardwareItem);
      expect(reservation.user.id).toEqual(testUser.id);
    });

    test("Should ensure undefined returned when no reservation exists", async (): Promise<void> => {
      // Perform the test
      const reservation: ReservedHardwareItem = await reservedHardwareService.getReservation("doesnt_exist");
      expect(reservation).toBeUndefined();
    });
  });

  /**
   * Test cancelReservation
   */
  describe("cancelReservation tests", (): void => {
    let hardwareRepository: Repository<HardwareItem>;
    let userRepository: Repository<User>;
    let reservedHardwareRepository: Repository<ReservedHardwareItem>;

    beforeEach(async (): Promise<void> => {
      hardwareRepository = getRepository(HardwareItem);
      userRepository = getRepository(User);
      reservedHardwareRepository = getRepository(ReservedHardwareItem);
      await userRepository.save(testUser);
      await hardwareRepository.save(piHardwareItem);
      await hardwareRepository.save(viveHardwareItem);
    });

    test("Should ensure reservation can be cancelled by token and userID", async (): Promise<void> => {
      // Test setup
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: piHardwareItem, reservationToken: `${itemReservation.reservationToken}1`});
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: viveHardwareItem, reservationToken: `${itemReservation.reservationToken}2`});

      // Perform the test
      const tokenToFind: string = `${itemReservation.reservationToken}2`;
      await reservedHardwareService.cancelReservation(tokenToFind, testUser.id);

      // Check that the number of reserved items has decresed
      const reservedItem: HardwareItem = await hardwareRepository.findOne(viveHardwareItem.id);
      expect(reservedItem.reservedStock).toBe(-itemReservation.reservationQuantity);
    });
    test("Should ensure error thrown when no reservation exists", async (): Promise<void> => {
      // Perform the test
      try {
        await reservedHardwareService.cancelReservation("doesnt_exist", testUser.id);
      } catch (e) {
        expect(e.statusCode).toBe(HttpResponseCode.BAD_REQUEST);
      }
    });
    test("Should ensure error thrown when reservation exists but item taken", async (): Promise<void> => {
      // Test setup
      const newReservation: ReservedHardwareItem = {...itemReservation, user: testUser, hardwareItem: piHardwareItem, isReserved: false};
      await reservedHardwareRepository.save(newReservation);

      // Perform the test
      try {
        await reservedHardwareService.cancelReservation(itemReservation.reservationToken, testUser.id);
      } catch (e) {
        expect(e.statusCode).toBe(HttpResponseCode.BAD_REQUEST);
      }

      // Check that the number of reserved items has not decreased and the reservation still exists
      const reservedItem: HardwareItem = await hardwareRepository.findOne(piHardwareItem.id);
      expect(reservedItem.reservedStock).toBe(piHardwareItem.reservedStock);

      const reservation: ReservedHardwareItem = await reservedHardwareRepository
      .createQueryBuilder()
      .where("reservationToken = :token", {token: itemReservation.reservationToken})
      .getOne();
      expect(reservation.isReserved).toBe(newReservation.isReserved);
      expect(reservation.reservationToken).toBe(newReservation.reservationToken);
    });
  });


  /**
   * Test deleteReservation
   */
  describe("deleteReservation tests", (): void => {
    let hardwareRepository: Repository<HardwareItem>;
    let userRepository: Repository<User>;
    let reservedHardwareRepository: Repository<ReservedHardwareItem>;

    beforeEach(async (): Promise<void> => {
      hardwareRepository = getRepository(HardwareItem);
      userRepository = getRepository(User);
      reservedHardwareRepository = getRepository(ReservedHardwareItem);
      await userRepository.save(testUser);
      await hardwareRepository.save(piHardwareItem);
      await hardwareRepository.save(viveHardwareItem);
    });

    test("Should ensure reservation can be found by token", async (): Promise<void> => {
      // Test setup
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: piHardwareItem, reservationToken: `${itemReservation.reservationToken}1`});
      await reservedHardwareRepository.save({...itemReservation, user: testUser, hardwareItem: viveHardwareItem, reservationToken: `${itemReservation.reservationToken}2`});

      // Perform the test
      const tokenToFind: string = `${itemReservation.reservationToken}2`;
      const reservation: ReservedHardwareItem = await reservedHardwareService.getReservation(tokenToFind);
      expect(reservation).toBeDefined();
      expect(reservation.hardwareItem).toEqual(viveHardwareItem);
      expect(reservation.user.id).toEqual(testUser.id);
    });

    test("Should ensure undefined returned when no reservation exists", async (): Promise<void> => {
      // Perform the test
      const reservation: ReservedHardwareItem = await reservedHardwareService.getReservation("doesnt_exist");
      expect(reservation).toBeUndefined();
    });
  });
});

afterAll(async (): Promise<void> => {
  await closeTestDatabaseConnection();
});