using System.Collections.Generic;
using System.Linq;
using Jypeli;
using Jypeli.Widgets;

/// <summary>
/// Running game
/// </summary>
public class RunningGame : PhysicsGame
{
    private const double SPEED = 525;
    private const double JUMPING_SPEED = 700;
    private const int MAP_ELEMENT_SIZE = 40;
    private readonly Image[] playerRunning = LoadImages("player1_sprite0", "player1_sprite1", "player1_sprite2", "player1_sprite3");

    private PlatformCharacter player1;
    private List<GameObject> mapElements = new List<GameObject>();
    private int mapDestructionX;
    private int mapCreationX;
    private int mapCreationY;
    private IntMeter pointCounter;
    private EasyHighScore highScore = new EasyHighScore();

    // Fixes an occasional crash with highScore.EnterAndShow(): "Object cannot be added to multiple layers"
    private bool highScoreShown;


    /// <summary>
    /// Starts the game.
    /// </summary>
    public override void Begin()
    {
        // Borderless windowed
        IsFullScreen = true;
        Vector fullScreenSize = Screen.Size;
        IsFullScreen = false;
        Screen.Size = fullScreenSize;

        mapDestructionX = (int)Screen.Left - MAP_ELEMENT_SIZE;
        mapCreationX = (int)(Screen.Right + Screen.Width);
        mapCreationY = (int)(Screen.Bottom);

        MediaPlayer.Play("menu_tune.wav");
        MediaPlayer.IsRepeating = true;
        MainMenu();
    }


    /// <summary>
    /// Opens the main menu.
    /// </summary>
    private void MainMenu()
    {
        Level.Background.CreateGradient(Color.LightGray, Color.DarkGray);
        MultiSelectWindow mainMenu = new MultiSelectWindow("", "Start Game", "High Scores", "Exit");
        mainMenu.AddItemHandler(0, InitializeGame);
        mainMenu.AddItemHandler(1, ShowHighScores);
        mainMenu.AddItemHandler(2, Exit);
        mainMenu.DefaultCancel = -1;
        Add(mainMenu);

        Label mainTitle = new Label("Running Game");
        mainTitle.Font = new Font((int)Screen.Width / 11);
        mainTitle.X = (Screen.Left + Screen.Right) / 2;
        mainTitle.Y = Screen.Top - mainTitle.Height;
        Add(mainTitle);
    }


    /// <summary>
    /// Opens the main menu.
    /// </summary>
    /// <param name="sender">the caller window</param>
    private void MainMenu(Window sender)
    {
        ClearAll();
        MainMenu();
    }


    /// <summary>
    /// Initializes the game
    /// </summary>
    private void InitializeGame()
    {
        ClearAll();
        MediaPlayer.Stop();
        highScoreShown = false;
        IsMouseVisible = false;
        Gravity = new Vector(0, -2200);
        Level.Background.CreateGradient(Color.LightGray, Color.DarkGray);
        AddPlayer(new Vector(0, Screen.Top), MAP_ELEMENT_SIZE * 1.2, MAP_ELEMENT_SIZE * 1.2);

        Camera.FollowX(player1);
        Camera.ZoomFactor = 1.0;
        Camera.Position += new Vector(0, Screen.Height * 0.1);
        Camera.FollowOffset = new Vector(Screen.Width * 0.2, 0);

        Timer mapGeneration = new Timer();
        mapGeneration.Interval = 0.05;
        mapGeneration.Timeout += GenerateMap;
        mapGeneration.Start();

        AddPointCounter();
        AddGameControls();
    }


    /// <summary>
    /// Initializes the game.
    /// </summary>
    /// <param name="sender">the caller window</param>
    private void InitializeGame(Window sender)
    {
        mapElements.Clear();
        InitializeGame();
    }


    /// <summary>
    /// Generates the game map.
    /// </summary>
    private void GenerateMap()
    {
        // When starting a new game
        if (mapElements.Count == 0)
        {
            CreateMapElement(mapDestructionX + MAP_ELEMENT_SIZE, mapCreationY);
            for (int i = (int)(Screen.Width / MAP_ELEMENT_SIZE); i > 0; i--)
            {
                CreateMapElement(mapElements[mapElements.Count - 1].X + MAP_ELEMENT_SIZE, mapCreationY);
            }
            return;
        }

        // Map creation
        if (mapElements[mapElements.Count - 1].X < player1.X + mapCreationX)
        {
            int[] mapPatternProbabilities = new int[] { 2, 2, 1, 2, 6 };

            // Scale the probability values (0-??) to an easy-to-use range (0-100) and make them usable for range matching
            // An example: [1, 1, 0, 1, 2] --> [20, 40, 40, 60, 100]
            int rangeMax = 100;
            int[] scaledProbabilities = new int[mapPatternProbabilities.Length];
            mapPatternProbabilities.CopyTo(scaledProbabilities, 0);
            int scaledProbabilitiesSum = 0;
            for (int i = 0; i < scaledProbabilities.Length; i++)
            {
                scaledProbabilitiesSum += (int)ScaleNumberToRange(0, mapPatternProbabilities.Sum(), 0, rangeMax, scaledProbabilities[i]);
                scaledProbabilities[i] = scaledProbabilitiesSum;
            }

            // Selects a map pattern
            int p = (int)(1.5 * MAP_ELEMENT_SIZE);  // pillar height
            int h = -(int)Screen.Height;  // hole depth
            int[] pattern = (RandomGen.NextInt(0, rangeMax)) switch
            {
                int n when (n <= scaledProbabilities[0]) => new int[] { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, p },
                int n when (n <= scaledProbabilities[1]) => new int[] { 0, 0, 0, 0, 0, 0, 0, 0, 0, p, p },
                int n when (n <= scaledProbabilities[2]) => new int[] { 0, 0, 0, 0, 0, 0, 0, 0, p, p, p },
                int n when (n <= scaledProbabilities[3]) => new int[] { 0, 0, 0, 0, 0, 0, p, p, 0, 0, 0, 0, 0, 0, p, p },
                int n when (n <= scaledProbabilities[4]) => new int[] { 0, 0, 0, 0, 0, 0, h, h, h, h, h, h },
                _ => new int[] { },
            };

            // Interprets and adds the selected pattern to the game
            for (int i = 0; i < pattern.Length; i++)
            {
                CreateMapElement(mapElements[mapElements.Count - 1].X + MAP_ELEMENT_SIZE, mapCreationY + pattern[i]);
            }
        }

        // Map destruction
        if (mapElements[0].X <= player1.X + mapDestructionX)
        {
            mapElements[0].Destroy();
            mapElements.Remove(mapElements[0]);
            pointCounter.Value += 1;
        }
    }


    /// <summary>
    /// Creates a map element.
    /// </summary>
    /// <param name="x">location on x-axis</param>
    /// <param name="y">location on y-axis</param>
    private void CreateMapElement(double x, double y)
    {
        MapElement element = new MapElement(MAP_ELEMENT_SIZE, MAP_ELEMENT_SIZE * 20, Shape.Rectangle);
        element.Color = Color.Black;
        element.X = x;
        element.Y = y;
        element.KineticFriction = 0;
        element.StaticFriction = 0;
        element.Restitution = 0;

        if (y == mapCreationY)
        {
            PhysicsObject collisionShield = PhysicsObject.CreateStaticObject(MAP_ELEMENT_SIZE, MAP_ELEMENT_SIZE, Shape.Rectangle);
            element.Add(collisionShield);
            collisionShield.Color = Color.Black;
            collisionShield.X = x;
            collisionShield.Y = y + MAP_ELEMENT_SIZE * 10 + 5;
            Add(collisionShield);
        }

        mapElements.Add(element);
        Add(element);
    }


    /// <summary>
    /// Shows the high score window.
    /// </summary>
    private void ShowHighScores()
    {
        highScore.Show();
        highScore.HighScoreWindow.Closed += MainMenu;
    }


    /// <summary>
    /// Adds the player to the game.
    /// </summary>
    /// <param name="position">player position</param>
    /// <param name="width">player width</param>
    /// <param name="height">player height</param>
    private void AddPlayer(Vector position, double width, double height)
    {
        player1 = new PlatformCharacter(width, height);
        player1.Position = position;
        player1.Restitution = 0;
        player1.KineticFriction = 0;
        player1.StaticFriction = 0;
        Add(player1);
        player1.Animation = new Animation(playerRunning);
        player1.Animation.FPS = 8;
        player1.Animation.Start();
        AddCollisionHandler<PlatformCharacter, MapElement>(player1, PlayerCollidedPainfully);
        AddCollisionHandler<PlatformCharacter, PhysicsObject>(player1, PlayerCollidedPeacefully);
        ControllerOne.Listen(Button.DPadRight, ButtonState.Irrelevant, CharacterWalk, "Player is forced to move forward", player1, SPEED);
    }


    /// <summary>
    /// Handles collisions between the player and a map element.
    /// </summary>
    /// <param name="player">player</param>
    /// <param name="mapElement">map element</param>
    private void PlayerCollidedPainfully(PlatformCharacter player, PhysicsObject mapElement)
    {

        if (!highScoreShown)
        {
            highScoreShown = true;
            player1.Animation.Stop();
            StopAll();
            highScore.EnterAndShow(pointCounter.Value);
            highScore.HighScoreWindow.Closed += InitializeGame;
        }
    }

    
    /// <summary>
    /// An attempt to fix a bug with the player restitution.
    /// </summary>
    /// <param name="player"></param>
    /// <param name="mapElement"></param>
    private void PlayerCollidedPeacefully(PlatformCharacter player, PhysicsObject mapElement)
    {
        player.StopVertical();
    }


    /// <summary>
    /// Makes a game character walk.
    /// </summary>
    /// <param name="character">character</param>
    /// <param name="speed">walking speed</param>
    private void CharacterWalk(PlatformCharacter character, double speed)
    {
        character.Walk(speed);
    }


    /// <summary>
    /// Makes a game character jump.
    /// </summary>
    /// <param name="character">character</param>
    /// <param name="speed">jumping speed</param>
    private void CharacterJump(PlatformCharacter character, double speed)
    {
        character.Jump(speed);
    }


    /// <summary>
    /// Adds a point counter display to the game.
    /// </summary>
    private void AddPointCounter()
    {
        int margin = 20;
        pointCounter = new IntMeter(0);

        Label pointCounterDisplay = new Label();
        pointCounterDisplay.X = (Screen.Left + Screen.Right) / 2;
        pointCounterDisplay.Y = Screen.Top - (pointCounterDisplay.Height / 2 + margin);
        pointCounterDisplay.TextColor = Color.Black;
        pointCounterDisplay.Color = Color.White;
        pointCounterDisplay.XMargin = margin;
        pointCounterDisplay.YMargin = margin;

        pointCounterDisplay.BindTo(pointCounter);
        Add(pointCounterDisplay);
    }


    /// <summary>
    /// Adds controls to the game.
    /// </summary>
    private void AddGameControls()
    {
        Keyboard.Listen(Key.F1, ButtonState.Pressed, ShowControlHelp, "Show help");
        Keyboard.Listen(Key.Escape, ButtonState.Pressed, ConfirmExit, "End the game");
        Keyboard.Listen(Key.Up, ButtonState.Down, CharacterJump, "Jump", player1, JUMPING_SPEED);

        ControllerOne.Listen(Button.Back, ButtonState.Pressed, ConfirmExit, "End the game");
        ControllerOne.Listen(Button.A, ButtonState.Pressed, CharacterJump, "Jump", player1, JUMPING_SPEED);

        //PhoneBackButton.Listen(ConfirmExit, "End the game");
    }


    /// <summary>
    /// Scales a number from an old value range to a new value range.
    /// </summary>
    /// <param name="oldMin">minimum value of the old range</param>
    /// <param name="oldMax">maximum value of the old range</param>
    /// <param name="newMin">minimum value of the new range</param>
    /// <param name="newMax">maximum value of the new range</param>
    /// <param name="num">number to be scaled</param>
    /// <returns>A scaled number.</returns>
    /// <example>
    /// <pre name="test">
    ///  JuoksevaMies.ScaleNumberToRange(0, 10, 0, 100, 8) ~~~ 80;
    ///  JuoksevaMies.ScaleNumberToRange(-10, 0, 0, 100, -5) ~~~ 50;
    ///  JuoksevaMies.ScaleNumberToRange(13, 19, 0, 100, 19) ~~~ 100;
    ///  JuoksevaMies.ScaleNumberToRange(0, 1000, 0, 100, 111) ~~~ 11.1;
    ///  JuoksevaMies.ScaleNumberToRange(0, 1000, 0, 100, 5.0) ~~~ 0.5;
    ///  JuoksevaMies.ScaleNumberToRange(0, 1000, 0, 100, 4.99) ~~~ 0.499;
    /// </pre>
    /// </example>
    public static double ScaleNumberToRange(double oldMin, double oldMax, double newMin, double newMax, double num)
    {
        return ((num - oldMin) / (oldMax - oldMin)) * (newMax - newMin) + newMin;
    }


    /// <summary>
    /// A map element is a building block of the game map.
    /// </summary>
    private class MapElement : PhysicsObject
    {
        /// <summary>
        /// Creates a map element.
        /// </summary>
        /// <param name="x">location on x-axis</param>
        /// <param name="y">location on y-axis</param>
        /// <param name="shape">shape of the map element</param>
        public MapElement(double x, double y, Shape shape)
            : base(x, y, shape)
        {
            this.MakeStatic();
        }
    }

}
